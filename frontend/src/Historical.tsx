import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";

const MAX_BYTES = 5_000_000;
type Completion = {
  inserted: number;
  duplicates: number;
  start: string;
  end: string;
};

function feedback(detail: unknown): string {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .slice(0, 100)
      .map((error: { loc?: (string | number)[]; msg?: string }) => {
        const loc = error.loc ?? [];
        const index = loc.findIndex((part) => typeof part === "number");
        const field = index >= 0 ? loc.slice(index + 1).join(".") : "events";
        return `${index >= 0 ? `Row ${Number(loc[index]) + 1}, ` : ""}${field}: ${error.msg ?? "invalid value"}`;
      })
      .join("\n");
  }
  return "The server rejected this file. Check the event schema and retry.";
}

function readFile(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) resolve(reader.result);
      else
        reject(
          new Error("Could not read the file. Choose it again and retry."),
        );
    };
    reader.onerror = reader.onabort = () =>
      reject(new Error("Could not read the file. Choose it again and retry."));
    reader.readAsArrayBuffer(file);
  });
}

export function HistoricalUpload({
  onImported,
  onBrowse,
}: {
  onImported: () => void;
  onBrowse: (start: string, end: string) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState("");
  const [error, setError] = useState("");
  const [uncertain, setUncertain] = useState(false);
  const [done, setDone] = useState<Completion | null>(null);
  const inFlight = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!file || inFlight.current) return;
    setDone(null);
    setError("");
    if (file.size > MAX_BYTES) {
      setError(
        "File exceeds 5 MB (5,000,000 bytes). Split it into smaller JSON arrays and retry.",
      );
      return;
    }
    inFlight.current = true;
    setPhase("Reading file…");
    let sent = false;
    try {
      const body = await readFile(file);
      if (!mounted.current) return;
      setPhase("Uploading and validating events…");
      sent = true;
      const response = await fetch("/api/historical/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      if (!response.ok) {
        sent = response.status >= 500;
        const data = await response.json().catch(() => null);
        throw new Error(
          data
            ? feedback(data.detail)
            : `Upload failed (HTTP ${response.status}). Check the local server and retry.`,
        );
      }
      const result: Completion = await response.json();
      if (mounted.current) {
        setDone(result);
        onImported();
      }
    } catch (reason) {
      if (mounted.current) {
        setUncertain(sent);
        setError(
          sent
            ? "The server did not confirm the import. Some events may already be stored."
            : reason instanceof Error
              ? reason.message
              : "Could not read the file. Choose it again and retry.",
        );
      }
    } finally {
      inFlight.current = false;
      if (mounted.current) setPhase("");
    }
  }
  return (
    <section className="historical-upload" aria-labelledby="upload-heading">
      <h2 id="upload-heading">Import historical logs</h2>
      <p id="upload-help">
        UTF-8 JSON array · up to 5 MB (5,000,000 bytes) and 5,000 events.
        Imports never train live baselines or trigger alerts.
      </p>
      <details>
        <summary>Event format and retry behavior</summary>
        <p>
          Each event requires a timestamp with timezone, service, severity
          (DEBUG, INFO, WARNING, ERROR, FATAL), and message. Optional: metadata
          object and event_id. The whole file is rejected if any row is invalid
          or an ID conflicts.
        </p>
        <pre>
          {
            '[{"timestamp":"2026-01-01T12:00:00Z","service":"checkout","severity":"ERROR","message":"Downstream timeout","event_id":"import-1"}]'
          }
        </pre>
        <p>
          Identical supplied IDs deduplicate within Historical. Missing or null
          IDs generate new IDs on every import. If a connection fails after
          sending, events may already be stored: inspect Historical before
          retrying files without IDs.
        </p>
      </details>
      <form onSubmit={submit} aria-label="Import historical logs">
        <label>
          JSON log file
          <input
            type="file"
            accept=".json,application/json"
            disabled={!!phase}
            aria-describedby="upload-help"
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              setDone(null);
              setError("");
            }}
          />
        </label>
        <button className="primary" disabled={!file || !!phase}>
          Import into Historical
        </button>
      </form>
      <div role="status" aria-live="polite">
        {phase && (
          <>
            <p>{phase}</p>
            <progress aria-label={phase} />
          </>
        )}
        {done && (
          <p>
            Import complete: {done.inserted} inserted · {done.duplicates}{" "}
            duplicates. File event time (UTC): {done.start} → {done.end}.
          </p>
        )}
      </div>
      {done && (
        <button onClick={() => onBrowse(done.start, done.end)}>
          Browse file interval
        </button>
      )}
      {error && (
        <div className="upload-error" role="alert">
          <p>{error}</p>
          <p>
            {uncertain
              ? "Check the local server and inspect Historical before retrying. Files without stable event IDs can create duplicates on retry."
              : "Validation feedback lists up to 100 errors. Correct the file, choose it again, then import."}
          </p>
        </div>
      )}
    </section>
  );
}

type Bucket = {
  start: string;
  end: string;
  total: number;
  errors: number;
  rate: number | null;
};
type Trends = {
  total: number;
  start?: string;
  end?: string;
  bucket_seconds?: number;
  buckets: Bucket[];
};
const percent = (rate: number | null) =>
  rate === null ? "No traffic" : `${(rate * 100).toFixed(2)}%`;

function HistoricalChart({ data, volume }: { data: Trends; volume?: boolean }) {
  const ceiling = volume
    ? Math.max(1, ...data.buckets.map((row) => row.total))
    : 1;
  const points = data.buckets.map((row, i) => ({
    row,
    x: 42 + (i * 470) / Math.max(1, data.buckets.length - 1),
    y: 135 - ((volume ? row.total : (row.rate ?? 0)) / ceiling) * 115,
  }));
  return (
    <figure className="trend">
      <figcaption>
        {volume
          ? `Volume · events per ${data.bucket_seconds! / 60}-minute bucket`
          : "Error-log rate · percent"}
      </figcaption>
      <svg
        viewBox="0 0 540 180"
        role="img"
        aria-label={`Historical ${volume ? "volume" : "error-log rate"}. Exact UTC bucket values in the table below.`}
      >
        <path d="M42 20H520M42 77.5H520" className="chart-grid" />
        <path d="M42 20V135H520" className="chart-axis" />
        <text x="0" y="25">
          {volume ? ceiling : "100%"}
        </text>
        <text x="0" y="81.5">
          {volume ? ceiling / 2 : "50%"}
        </text>
        <text x="10" y="139">
          0
        </text>
        {points.map(({ row, x, y }, i) => (
          <g key={row.start}>
            {(volume || row.rate !== null) && (
              <circle cx={x} cy={y} r={2.5} className="chart-observed" />
            )}
            {i > 0 &&
              (volume ||
                (row.rate !== null && points[i - 1].row.rate !== null)) && (
                <path
                  className="chart-observed"
                  d={`M${points[i - 1].x} ${points[i - 1].y}L${x} ${y}`}
                />
              )}
          </g>
        ))}
        <text x="42" y="165">
          First bucket
        </text>
        <text x="520" y="165" textAnchor="end">
          Last bucket
        </text>
      </svg>
    </figure>
  );
}

export function HistoricalTrends({
  service,
  start,
  end,
  revision,
}: {
  service: string;
  start: string;
  end: string;
  revision: number;
}) {
  const [data, setData] = useState<Trends | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setError("");
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries({ service, start, end }))
      if (value) params.set(key, value);
    fetch(`/api/historical/trends?${params}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok)
          throw new Error(
            response.status === 422
              ? "Check the service and UTC time filters, then apply them again."
              : "Could not load historical trends. Check the local server and retry.",
          );
        const result: Trends = await response.json();
        if (!controller.signal.aborted) setData(result);
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError(
            "Could not load historical trends. Check the service/time filters and local server, then retry.",
          );
      });
    return () => controller.abort();
  }, [service, start, end, revision, retry]);
  return (
    <section
      className="service-trends"
      aria-labelledby="historical-trends-heading"
    >
      <h2 id="historical-trends-heading">Historical trends</h2>
      <p>
        {service || "All services combined"} · Uses applied service and UTC time
        filters. Severity and message refinements affect the log table only,
        keeping all events in the error-log rate denominator. No detector
        baseline or incidents.
      </p>
      {error ? (
        <div role="alert">
          <p>{error}</p>
          <button onClick={() => setRetry((value) => value + 1)}>
            Retry trends
          </button>
        </div>
      ) : !data ? (
        <p role="status">Loading historical trends…</p>
      ) : data.total === 0 ? (
        <p>
          No historical events in this service/time range. Import a file or
          adjust the filters.
        </p>
      ) : (
        <div className="service-trend">
          <p>
            {data.total} events · Observed event time (UTC): {data.start} →{" "}
            {data.end} (inclusive).
          </p>
          <p className="hint">
            Equal {data.bucket_seconds! / 60}-minute buckets, at most 30.
            ERROR/FATAL divided by all events. Rate gaps mean no traffic, not
            health.
          </p>
          <div className="trend-pair">
            <HistoricalChart data={data} />
            <HistoricalChart data={data} volume />
          </div>
          <details>
            <summary>Exact historical trend values · UTC</summary>
            <div
              className="table-scroll"
              role="region"
              aria-label="Historical trend values"
              tabIndex={0}
            >
              <table className="trend-table">
                <thead>
                  <tr>
                    <th>Bucket start</th>
                    <th>Bucket end (exclusive)</th>
                    <th>Events</th>
                    <th>ERROR/FATAL</th>
                    <th>Error-log rate</th>
                  </tr>
                </thead>
                <tbody>
                  {data.buckets.map((row) => (
                    <tr key={row.start}>
                      <td>{row.start}</td>
                      <td>{row.end}</td>
                      <td>{row.total}</td>
                      <td>{row.errors}</td>
                      <td>{percent(row.rate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </div>
      )}
    </section>
  );
}
