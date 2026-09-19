import { useCallback, useEffect, useRef, useState } from "react";

type Measurement = {
  id: number;
  service: string;
  start: string;
  end: string;
  total: number;
  errors: number;
  rate: number | null;
  expected: number | null;
  threshold: number | null;
  baseline_total: number;
  baseline_count: number;
  status: string;
};
type Incident = {
  id: number;
  service: string;
  state: string;
  start: string;
  end: string;
  recovery_streak: number;
  recovered_at: string | null;
  measurement: Measurement;
};
export type OverviewData = {
  dataset: string;
  delayed: boolean;
  server_time: string;
  progress: {
    clock: string;
    steps: number;
    next_start: string;
    last_success: string | null;
  };
  services: Measurement[];
  incidents: Incident[];
  trends: Measurement[];
  config: {
    recovery_windows: number;
    grace_seconds: number;
    minimum_events: number;
    minimum_baseline_windows: number;
  };
};
const pct = (value: number | null) =>
  value === null ? "Not evaluated" : `${(value * 100).toFixed(2)}%`;
const time = (value: string) => value.replace("T", " ").replace(/\.\d+Z$/, "Z");

function Trend({ rows, volume }: { rows: Measurement[]; volume?: boolean }) {
  const ceiling = volume ? Math.max(1, ...rows.map((row) => row.total)) : 1;
  const points = rows.map((row, index) => ({
    x: 42 + (index * 470) / Math.max(1, rows.length - 1),
    y: 135 - ((volume ? row.total : (row.rate ?? 0)) / ceiling) * 115,
    row,
  }));
  return (
    <figure className="trend">
      <figcaption>
        {volume ? "Volume · events per minute" : "Error-log rate · percent"}
      </figcaption>
      <svg
        viewBox="0 0 540 180"
        role="img"
        aria-label={`${rows[0]?.service}: ${volume ? "volume" : "error-log rate"}. Exact values in evaluated windows table below.`}
      >
        <path d="M42 20V135H520" className="chart-axis" />
        <text x="0" y="25">
          {volume ? ceiling : "100%"}
        </text>
        <text x="10" y="139">
          0
        </text>
        {points.map(({ x, y, row }, index) => (
          <g key={row.id}>
            {!volume && row.expected !== null && (
              <path
                className="chart-baseline"
                d={`M${x - 5} ${135 - row.expected * 115}h10`}
              />
            )}
            {!volume && row.threshold !== null && (
              <path
                className="chart-threshold"
                d={`M${x - 5} ${135 - row.threshold * 115}h10`}
              />
            )}
            {(volume || row.rate !== null) && (
              <circle
                cx={x}
                cy={y}
                r={row.status === "spike detected" ? 5 : 2.5}
                className={
                  row.status === "spike detected"
                    ? "chart-abnormal"
                    : "chart-observed"
                }
              />
            )}
            {index > 0 &&
              (volume ||
                (row.rate !== null && points[index - 1].row.rate !== null)) && (
                <path
                  className="chart-observed"
                  d={`M${points[index - 1].x} ${points[index - 1].y}L${x} ${y}`}
                />
              )}
          </g>
        ))}
        <text x="42" y="165">
          {rows[0]?.start.slice(11, 16)}
        </text>
        <text x="475" y="165">
          {rows.at(-1)?.start.slice(11, 16)}
        </text>
      </svg>
      {!volume && (
        <p className="hint">
          Solid: observed · short marks: baseline · dashed: threshold · large
          hollow circles: abnormal. Gaps mean no traffic.
        </p>
      )}
    </figure>
  );
}

export function Overview() {
  const params = new URLSearchParams(window.location.search);
  const dataset = params.get("dataset") ?? "demo";
  const [selected, setSelected] = useState(params.get("incident"));
  const [data, setData] = useState<OverviewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fetched, setFetched] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const queue = useRef<HTMLHeadingElement>(null);
  const advancing = useRef(false);
  const requestNumber = useRef(0);
  const mounted = useRef(true);
  const [announcement, setAnnouncement] = useState("");
  const refresh = useRef<() => void>(() => {});
  const previousIncidents = useRef<Map<number, string> | null>(null);
  const acceptResults = useCallback((next: OverviewData, advanced = false) => {
    const changes = next.incidents
      .filter(
        (incident) =>
          previousIncidents.current !== null &&
          previousIncidents.current.get(incident.id) !== incident.state,
      )
      .map(
        (incident) =>
          `${incident.service} incident #${incident.id} ${incident.state}.`,
      );
    previousIncidents.current = new Map(
      next.incidents.map((incident) => [incident.id, incident.state]),
    );
    setData(next);
    setFetched(new Date().toISOString());
    if (advanced || changes.length)
      setAnnouncement(
        [
          advanced
            ? `Simulation advanced to ${time(next.progress.clock)}.`
            : "",
          ...changes,
        ]
          .filter(Boolean)
          .join(" "),
      );
  }, []);
  useEffect(() => {
    mounted.current = true;
    const controller = new AbortController();
    async function load() {
      if (advancing.current) return;
      const number = ++requestNumber.current;
      try {
        const response = await fetch(`/api/datasets/${dataset}/overview`, {
          signal: controller.signal,
        });
        if (!response.ok)
          throw new Error(
            `Could not refresh overview (HTTP ${response.status}). Check the local server.`,
          );
        const next: OverviewData = await response.json();
        if (!controller.signal.aborted && number === requestNumber.current) {
          acceptResults(next);
          setError(null);
        }
      } catch (problem) {
        if (!controller.signal.aborted && number === requestNumber.current)
          setError(
            problem instanceof Error
              ? problem.message
              : "Could not refresh overview. Check the local server.",
          );
      }
    }
    refresh.current = () => {
      void load();
    };
    void load();
    const timer = window.setInterval(() => {
      void load();
    }, 5000);
    return () => {
      mounted.current = false;
      controller.abort();
      window.clearInterval(timer);
    };
  }, [dataset, revision, acceptResults]);
  useEffect(() => {
    const back = () =>
      setSelected(new URLSearchParams(window.location.search).get("incident"));
    window.addEventListener("popstate", back);
    return () => window.removeEventListener("popstate", back);
  }, []);
  async function advance() {
    advancing.current = true;
    ++requestNumber.current;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/demo/advance", { method: "POST" });
      if (!response.ok)
        throw new Error(
          `Could not advance simulation (HTTP ${response.status}). Refresh to check the current simulation time before trying again.`,
        );
      const next: OverviewData = await response.json();
      if (mounted.current) {
        acceptResults(next, true);
      }
    } catch (problem) {
      if (mounted.current)
        setError(
          problem instanceof Error
            ? problem.message
            : "Advance result unknown. Refresh to check simulation time before trying again.",
        );
    } finally {
      advancing.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  function select(id: string | null) {
    const next = new URLSearchParams(window.location.search);
    next.set("view", "overview");
    if (id) next.set("incident", id);
    else next.delete("incident");
    window.history.pushState({}, "", `?${next}`);
    setSelected(id);
    window.requestAnimationFrame(() => {
      if (id) heading.current?.focus();
      else
        (
          document.getElementById(`incident-${selected}`) ?? queue.current
        )?.focus();
    });
  }
  const incident = data?.incidents.find((i) => String(i.id) === selected);
  const latest = data?.services.find((s) => s.service === incident?.service);
  const recoveryStatus =
    incident?.state === "recovered"
      ? `Recovered at ${time(incident.recovered_at!)}`
      : latest?.status === "insufficient traffic"
        ? "Waiting for sufficient traffic to assess recovery. Consecutive normal run reset."
        : latest?.status === "spike detected"
          ? "Still abnormal — recovery not established."
          : `Recovery: ${incident?.recovery_streak ?? 0} of ${data?.config.recovery_windows} eligible normal windows`;
  return (
    <div className="workbench">
      <a href="#overview" className="skip-link">
        Skip to overview
      </a>
      <aside className="rail" aria-label="Workspace">
        <a className="brand" href="?view=overview&dataset=demo">
          Log Watchdog
        </a>
        <p className="local-label">Local workspace</p>
        <nav aria-label="Primary">
          <a href={`?view=overview&dataset=${dataset}`} aria-current="page">
            Overview
          </a>
          <a href={`?view=logs&dataset=${dataset}`}>Logs</a>
        </nav>
        <p className="rail-note">
          Structured events.
          <br />
          Evidence you can inspect.
        </p>
      </aside>
      <main id="overview">
        <header className="page-header">
          <div>
            <h1>Overview</h1>
            <p>Investigate unusual error-log rates.</p>
          </div>
          <label className="dataset-select">
            Dataset
            <select
              value={dataset}
              onChange={(event) => {
                window.location.href = `?view=${event.target.value === "historical" ? "logs" : "overview"}&dataset=${event.target.value}`;
              }}
            >
              <option value="demo">Demo</option>
              <option value="live">Live</option>
              <option value="historical">Historical</option>
            </select>
          </label>
        </header>
        <div className="overview-controls">
          <div>
            <strong>
              {dataset === "demo"
                ? "Demo · Synthetic scenario"
                : "Live · API events"}
            </strong>
            <p>
              {dataset === "demo"
                ? `Simulation paused · Simulation time (UTC): ${data ? time(data.progress.clock) : "Loading"}`
                : "Event time (UTC) · Automatic real-time evaluation"}
            </p>
            {dataset === "demo" && (
              <p className="hint">
                {!data || data.progress.steps === 0
                  ? "Next: downstream timeout spike"
                  : data.progress.steps < 2
                    ? "Next: continued spike"
                    : "Next: normal traffic / recovery"}
                . Each advance completes one minute and its lateness grace.
              </p>
            )}
          </div>
          <div className="overview-actions">
            {dataset === "demo" && (
              <button
                className="primary"
                disabled={busy || !data}
                onClick={() => void advance()}
              >
                {busy ? "Advancing…" : "Advance one minute"}
              </button>
            )}
            <button
              disabled={busy}
              onClick={() => {
                setRevision((v) => v + 1);
              }}
            >
              Refresh overview
            </button>
          </div>
        </div>
        <p className="sr-only" role="status">
          {announcement}
        </p>
        {error && (
          <div className="error" role="alert">
            <strong>Updates unavailable</strong>
            <p>{error}</p>
            {fetched && <p>Showing results fetched at {time(fetched)}.</p>}
            <button disabled={busy} onClick={() => refresh.current()}>
              Retry refresh
            </button>
          </div>
        )}
        {!data && !error && (
          <div className="loading" role="status">
            Loading overview…
          </div>
        )}
        {data && (
          <>
            <p className="refresh-time">
              Last evaluated through {time(data.progress.next_start)} · Last
              successful dashboard refresh {fetched && time(fetched)}
            </p>
            {data.delayed && (
              <p className="error" role="status">
                Evaluation delayed for window starting{" "}
                {time(data.progress.next_start)}. Keep the local server running;
                refresh to check progress. Last results remain below.
              </p>
            )}
            <div
              className={`incident-workbench ${selected ? "has-selection" : ""}`}
            >
              <section
                className="incident-queue"
                aria-labelledby="queue-heading"
              >
                <h2 id="queue-heading" ref={queue} tabIndex={-1}>
                  Incidents
                </h2>
                {!data.incidents.some((i) => i.state === "open") && (
                  <p className="no-active">
                    No active incidents. This does not establish overall service
                    health.
                  </p>
                )}
                {data.incidents.map((i) => (
                  <article
                    key={i.id}
                    className={
                      selected === String(i.id)
                        ? "incident-row selected"
                        : "incident-row"
                    }
                  >
                    <h3>{i.service}</h3>
                    <p>
                      <strong>
                        {i.state === "open" ? "Open" : "Recovered"}
                      </strong>
                      {selected === String(i.id) && " · Selected"}
                    </p>
                    <p>
                      {pct(i.measurement.rate)} observed /{" "}
                      {pct(i.measurement.expected)} expected error-log rate
                    </p>
                    <p className="hint">
                      {time(i.start)} → {time(i.end)}
                    </p>
                    <a
                      id={`incident-${i.id}`}
                      href={`?view=overview&dataset=${dataset}&incident=${i.id}`}
                      aria-current={
                        selected === String(i.id) ? "true" : undefined
                      }
                      onClick={(event) => {
                        if (
                          !event.ctrlKey &&
                          !event.metaKey &&
                          !event.shiftKey &&
                          !event.altKey &&
                          event.button === 0
                        ) {
                          event.preventDefault();
                          select(String(i.id));
                        }
                      }}
                    >
                      Investigate {i.service} incident #{i.id}
                    </a>
                  </article>
                ))}
              </section>
              <section
                className="incident-pane"
                aria-labelledby="incident-heading"
              >
                <h2 id="incident-heading" ref={heading} tabIndex={-1}>
                  {incident
                    ? `${incident.service} · ${incident.state}`
                    : selected
                      ? "Incident unavailable"
                      : "Select an incident"}
                </h2>
                {selected && (
                  <button onClick={() => select(null)}>
                    Back to incidents
                  </button>
                )}
                {selected && !incident && (
                  <p>
                    This incident is not available in the selected dataset.
                    Return to the incident queue.
                  </p>
                )}
                {!selected && (
                  <p>
                    Select an incident to compare its recorded measurement with
                    the baseline.
                  </p>
                )}
                {incident && (
                  <>
                    <p className="recovery-status">{recoveryStatus}</p>
                    <dl>
                      <dt>Incident interval (UTC)</dt>
                      <dd>
                        {time(incident.start)} → {time(incident.end)}
                      </dd>
                      <dt>Latest abnormal window</dt>
                      <dd>
                        {time(incident.measurement.start)} →{" "}
                        {time(incident.measurement.end)}
                      </dd>
                      <dt>Observed error-log rate</dt>
                      <dd>
                        {pct(incident.measurement.rate)} ·{" "}
                        {incident.measurement.errors} ERROR/FATAL /{" "}
                        {incident.measurement.total} events
                      </dd>
                      <dt>Expected baseline</dt>
                      <dd>
                        {pct(incident.measurement.expected)} ·{" "}
                        {incident.measurement.baseline_count} prior normal
                        windows / {incident.measurement.baseline_total} events
                      </dd>
                      <dt>Threshold</dt>
                      <dd>
                        {pct(incident.measurement.threshold)} · observed must
                        exceed threshold
                      </dd>
                    </dl>
                    <p className="workspace-footnote">
                      Recorded measurements exclude later arrivals. Detection is
                      a statistical heuristic, not a probability of failure.
                    </p>
                  </>
                )}
              </section>
            </div>
            <section
              className="service-trends"
              aria-labelledby="trends-heading"
            >
              <h2 id="trends-heading">Service trends</h2>
              <p>
                {dataset === "demo"
                  ? "Simulation time (UTC)"
                  : "Event time (UTC)"}{" "}
                · Last 30 evaluated minutes. Volume is not an anomaly detector.
              </p>
              {data.services.length === 0 && (
                <p className="no-active">
                  Learning baseline. Send live events and wait for a completed
                  minute plus {data.config.grace_seconds}s grace. At least{" "}
                  {data.config.minimum_events} events per window and{" "}
                  {data.config.minimum_baseline_windows} baseline windows are
                  required.
                </p>
              )}
              {data.services.map((service) => {
                const rows = data.trends.filter(
                  (row) => row.service === service.service,
                );
                return (
                  <section
                    key={service.service}
                    className="service-trend"
                    aria-label={`${service.service} trends`}
                  >
                    <h3>{service.service}</h3>
                    <p>
                      <strong>{service.status}</strong> · {service.errors}{" "}
                      ERROR/FATAL / {service.total} events · {pct(service.rate)}
                    </p>
                    <div className="trend-pair">
                      <Trend rows={rows} />
                      <Trend rows={rows} volume />
                    </div>
                    <details>
                      <summary>Evaluated windows for {service.service}</summary>
                      <div
                        className="table-scroll"
                        role="region"
                        aria-label={`${service.service} evaluated values`}
                        tabIndex={0}
                      >
                        <table className="trend-table">
                          <caption>
                            Exact chart values · UTC minute starts (end
                            exclusive)
                          </caption>
                          <thead>
                            <tr>
                              <th>Window start</th>
                              <th>Error-log rate</th>
                              <th>ERROR/FATAL / total</th>
                              <th>Baseline</th>
                              <th>Threshold</th>
                              <th>State</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((row) => (
                              <tr key={row.id}>
                                <td>{time(row.start)}</td>
                                <td>{pct(row.rate)}</td>
                                <td>
                                  {row.errors} / {row.total}
                                </td>
                                <td>{pct(row.expected)}</td>
                                <td>{pct(row.threshold)}</td>
                                <td>{row.status}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </details>
                  </section>
                );
              })}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
