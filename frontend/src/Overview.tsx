import { EvidencePane } from "./EvidencePane";
import {
  useDocumentTitle,
  PageLink,
  viewUrl,
  usePageRestoration,
} from "./navigation";
import { useCallback, useEffect, useRef, useState } from "react";

export type Measurement = {
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
  run?: string | null;
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

export function Trend({
  rows,
  volume,
}: {
  rows: Measurement[];
  volume?: boolean;
}) {
  const latest = rows.at(-1);
  if (rows.length === 1 && !volume) {
    const row = rows[0];
    return (
      <figure className="window-comparison">
        <figcaption>Error-log rate · evaluated window</figcaption>
        <dl>
          <div>
            <dt>Observed</dt>
            <dd
              className={
                row.status === "spike detected" ? "abnormal-value" : undefined
              }
            >
              {pct(row.rate)}
            </dd>
          </div>
          <div>
            <dt>Expected baseline</dt>
            <dd>{pct(row.expected)}</dd>
          </div>
          <div>
            <dt>Threshold</dt>
            <dd>{pct(row.threshold)}</dd>
          </div>
        </dl>
        <p className="hint">
          {row.status} · {time(row.start)} → {time(row.end)}
        </p>
      </figure>
    );
  }
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
        {latest && (
          <span className="chart-reading">
            Latest: {volume ? `${latest.total} events` : pct(latest.rate)}
          </span>
        )}
      </figcaption>
      <svg
        viewBox="0 0 540 180"
        role="img"
        aria-label={`${rows[0]?.service}: ${volume ? "volume" : "error-log rate"}. ${rows.length === 1 ? `${rows[0].errors} ERROR/FATAL / ${rows[0].total} events, observed ${pct(rows[0].rate)}, expected ${pct(rows[0].expected)}, threshold ${pct(rows[0].threshold)}.` : "Exact values in evaluated windows table below."}`}
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
                r={!volume && row.status === "spike detected" ? 5 : 2.5}
                className={
                  !volume && row.status === "spike detected"
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
        <text x="520" y="165" textAnchor="end">
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
  const [location, setLocation] = useState(window.location.search);
  const params = new URLSearchParams(location);
  const dataset = params.get("dataset") ?? "demo";
  const isIncidents = params.get("view") === "incidents";
  const destination = isIncidents ? "incidents" : "overview";
  useDocumentTitle(isIncidents ? "Incidents" : "Overview");
  const [selected, setSelected] = useState(params.get("incident"));
  const [data, setData] = useState<OverviewData | null>(null);
  const reset =
    dataset === "demo" &&
    params.has("run") &&
    Boolean(data?.run) &&
    params.get("run") !== data?.run;
  const [error, setError] = useState<string | null>(null);
  const [fetched, setFetched] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const resetRun = useRef<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState("");
  const [resetError, setResetError] = useState("");
  const resetButton = useRef<HTMLButtonElement>(null);
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
    if (advanced || changes.length) {
      setResetMessage("");
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
    }
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
            `Could not refresh ${destination} (HTTP ${response.status}). Check the local server.`,
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
              : `Could not refresh ${destination}. Check the local server.`,
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
  }, [dataset, revision, acceptResults, destination]);
  usePageRestoration(
    data !== null || error !== null,
    // A failed initial load has no workbench headings or evidence controls.
    !data || reset
      ? "overview-heading"
      : selected
        ? "incident-heading"
        : "queue-heading",
    true,
  );
  useEffect(() => {
    const back = () => {
      setLocation(window.location.search);
      setSelected(new URLSearchParams(window.location.search).get("incident"));
    };
    window.addEventListener("popstate", back);
    return () => window.removeEventListener("popstate", back);
  }, []);
  async function advance() {
    if (reset || advancing.current) return;
    advancing.current = true;
    ++requestNumber.current;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/demo/advance${data?.run ? `?run=${encodeURIComponent(data.run)}` : ""}`,
        { method: "POST" },
      );
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
  async function resetDemo() {
    if (reset || advancing.current || !resetRun.current) return;
    advancing.current = true;
    ++requestNumber.current;
    setBusy(true);
    setResetting(true);
    setResetError("");
    setResetMessage("");
    try {
      const response = await fetch("/api/demo/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          run: resetRun.current,
          confirm_demo_only: true,
        }),
      });
      if (!response.ok)
        throw new Error(
          response.status === 409
            ? "This demo run was already reset. Cancel, refresh this page, then open Reset demo again."
            : `Reset result unknown (HTTP ${response.status}). Refresh this page to check the current run before retrying.`,
        );
      const next: OverviewData = await response.json();
      if (!mounted.current) return;
      previousIncidents.current = null;
      acceptResults(next);
      setError(null);
      setSelected(null);
      window.history.pushState(
        { focus: "reset-demo" },
        "",
        `?view=overview&dataset=demo&run=${encodeURIComponent(next.run!)}`,
      );
      setLocation(window.location.search);
      setConfirmReset(false);
      setResetMessage(
        "Demo reset. Normal history restored; Live and Historical are unchanged.",
      );
      window.requestAnimationFrame(() => resetButton.current?.focus());
    } catch (problem) {
      if (mounted.current)
        setResetError(
          problem instanceof Error
            ? problem.message
            : "Reset result unknown. Refresh this page before retrying.",
        );
    } finally {
      advancing.current = false;
      if (mounted.current) {
        setBusy(false);
        setResetting(false);
      }
    }
  }
  function select(id: string | null) {
    const next = new URLSearchParams(window.location.search);
    next.set("view", "incidents");
    const chosen = data?.incidents.find((i) => String(i.id) === id);
    if (chosen) {
      next.set("evaluation", String(chosen.measurement.id));
      next.set("service", chosen.service);
      next.set("start", chosen.measurement.start);
      next.set("end", chosen.measurement.end);
    } else next.delete("evaluation");
    next.delete("event_id");
    if (data?.run) next.set("run", data.run);
    if (id) next.set("incident", id);
    else next.delete("incident");
    window.history.replaceState(
      {
        ...window.history.state,
        scrollY: window.scrollY,
        focus: id ? `incident-${id}` : "incident-heading",
      },
      "",
      window.location.href,
    );
    window.history.pushState(
      {
        focus: id ? "incident-heading" : `incident-${selected}`,
        scrollY: window.scrollY,
      },
      "",
      `?${next}`,
    );
    setLocation(window.location.search);
    setSelected(id);
    const selectionUrl = window.location.search;
    const selectionFocus = document.activeElement;
    window.requestAnimationFrame(() => {
      if (
        window.location.search !== selectionUrl ||
        (document.activeElement !== selectionFocus &&
          document.activeElement !== document.body)
      )
        return;
      if (id) heading.current?.focus();
      else
        (
          document.getElementById(`incident-${selected}`) ?? queue.current
        )?.focus();
    });
  }
  const incident = reset
    ? undefined
    : data?.incidents.find((i) => String(i.id) === selected);
  useEffect(() => {
    if (!incident || params.has("evaluation")) return;
    const url = viewUrl(params.get("view") ?? "incidents", {
      evaluation: String(incident.measurement.id),
      service: incident.service,
      start: incident.measurement.start,
      end: incident.measurement.end,
      run: data?.run ?? null,
    });
    window.history.replaceState(window.history.state, "", url);
    setLocation(window.location.search);
  }, [incident, location, data?.run]);
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
        Skip to {destination}
      </a>
      <aside className="rail" aria-label="Workspace">
        <a className="brand" href="?view=overview&dataset=demo">
          Log Watchdog
        </a>
        <p className="local-label">Local workspace</p>
        <nav aria-label="Primary">
          <PageLink
            href={viewUrl("overview")}
            focus="overview-heading"
            aria-current={
              params.get("view") !== "incidents" ? "page" : undefined
            }
          >
            Overview
          </PageLink>
          <PageLink
            href={viewUrl("incidents")}
            focus="queue-heading"
            aria-current={
              params.get("view") === "incidents" ? "page" : undefined
            }
          >
            Incidents
          </PageLink>
          <PageLink
            href={viewUrl(
              "logs",
              incident
                ? {
                    evaluation:
                      params.get("evaluation") ??
                      String(incident.measurement.id),
                    run: data?.run ?? null,
                    scope: "evaluated",
                    service: incident.service,
                    start: params.get("start") ?? incident.measurement.start,
                    end: params.get("end") ?? incident.measurement.end,
                  }
                : {},
            )}
            focus="logs-heading"
          >
            Logs
          </PageLink>
          <PageLink href={viewUrl("deliveries")} focus="deliveries-heading">
            Deliveries
          </PageLink>
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
            <h1 id="overview-heading" tabIndex={-1}>
              {params.get("view") === "incidents" ? "Incidents" : "Overview"}
            </h1>
            <p>
              {isIncidents
                ? "Select an incident to investigate its evidence."
                : "Check recent incidents and service trends."}
            </p>
          </div>
          <label className="dataset-select">
            Dataset
            <select
              value={dataset}
              onChange={(event) => {
                window.location.href = `?view=${event.target.value === "historical" ? "logs" : destination}&dataset=${event.target.value}`;
              }}
            >
              <option value="demo">Demo</option>
              <option value="live">Live</option>
              <option value="historical">Historical</option>
            </select>
          </label>
        </header>
        {reset && (
          <div className="error" role="alert">
            <p>This demo run was reset. Return to the current demo.</p>
            <PageLink
              href={`?view=overview&dataset=demo&run=${encodeURIComponent(data!.run!)}`}
              focus="queue-heading"
            >
              Return to current demo
            </PageLink>
          </div>
        )}
        <div className="overview-controls">
          <div>
            <strong>
              {dataset === "demo"
                ? "Demo · Simulated data"
                : "Live · Incoming logs"}
            </strong>
            <p>
              {dataset === "demo"
                ? `Paused · Simulation time (UTC): ${data ? time(data.progress.clock) : "Loading"}`
                : "Live monitoring · Event time (UTC)"}
            </p>
            {dataset === "demo" && (
              <p className="hint">
                {!data || data.progress.steps === 0
                  ? "Next: downstream timeout spike"
                  : data.progress.steps < 2
                    ? "Next: continued spike"
                    : "Next: normal traffic / recovery"}
                . Advance to evaluate the next minute.
              </p>
            )}
          </div>
          <div className="overview-actions">
            {dataset === "demo" && (
              <button
                className="primary"
                disabled={busy || reset || confirmReset || !data}
                onClick={() => void advance()}
              >
                {busy && !resetting ? "Advancing…" : "Advance one minute"}
              </button>
            )}
            {dataset === "demo" && (
              <button
                id="reset-demo"
                ref={resetButton}
                disabled={busy || reset || !data?.run}
                aria-expanded={confirmReset}
                aria-controls="reset-confirmation"
                onClick={() => {
                  resetRun.current = data?.run ?? null;
                  setConfirmReset(true);
                  setResetError("");
                  setResetMessage("");
                }}
              >
                Reset demo
              </button>
            )}
            <button
              id="refresh-overview"
              disabled={busy}
              onClick={() => {
                setRevision((v) => v + 1);
              }}
            >
              Refresh {destination}
            </button>
          </div>
        </div>
        {dataset === "demo" && confirmReset && (
          <section
            id="reset-confirmation"
            className="reset-confirmation"
            aria-labelledby="reset-title"
          >
            <h2 id="reset-title">Reset only Demo?</h2>
            <p>
              This deletes Demo logs, incidents, evaluations and delivery
              history, cancels queued Demo notifications, and restores normal
              history and the default receiver behavior. Live and Historical
              data are unchanged.
            </p>
            <div className="overview-actions">
              <button
                className="destructive"
                disabled={busy || reset}
                onClick={() => void resetDemo()}
              >
                {resetting ? "Resetting Demo…" : "Confirm reset Demo only"}
              </button>
              <button
                disabled={busy}
                onClick={() => {
                  setConfirmReset(false);
                  setResetError("");
                  resetButton.current?.focus();
                }}
              >
                Cancel reset
              </button>
            </div>
            {resetError && <p role="alert">{resetError}</p>}
          </section>
        )}
        <p className={resetMessage ? undefined : "sr-only"} role="status">
          {resetMessage || announcement}
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
            Loading {destination}…
          </div>
        )}
        {data && !reset && (
          <>
            <p className="refresh-time">
              Evaluated through {time(data.progress.next_start)} · Last
              refreshed {fetched && time(fetched)}
            </p>
            {data.delayed && (
              <p className="error" role="status">
                Evaluation delayed for window starting{" "}
                {time(data.progress.next_start)}. Keep the local server running;
                refresh to check progress. Last results remain below.
              </p>
            )}
            <div
              className={`incident-workbench ${isIncidents ? "investigation-view" : "summary-view"} ${selected && isIncidents ? "has-selection" : ""} ${!selected && data.incidents.length === 0 ? "is-empty" : ""}`}
            >
              <section
                className="incident-queue"
                aria-labelledby="queue-heading"
              >
                <h2 id="queue-heading" ref={queue} tabIndex={-1}>
                  {isIncidents ? "Incident queue" : "Recent incidents"}
                </h2>
                {!data.incidents.some((i) => i.state === "open") && (
                  <p className="no-active">
                    No active incidents. This is not an overall health
                    assessment.
                  </p>
                )}
                {data.incidents.length === 0 && !selected && (
                  <p className="empty-guidance">
                    {dataset === "demo" ? (
                      "Advance one minute to simulate downstream timeouts, then investigate the spike."
                    ) : (
                      <>
                        Send structured events through the{" "}
                        <a href="/docs">local ingestion API</a>. Completed
                        windows build each service’s baseline before detection
                        begins.
                      </>
                    )}
                  </p>
                )}
                {data.incidents.length > 0 && (
                  <ul className="incident-list" aria-label="Incident queue">
                    {data.incidents.map((i) => (
                      <li
                        key={i.id}
                        className={
                          isIncidents && selected === String(i.id)
                            ? "incident-row selected"
                            : "incident-row"
                        }
                      >
                        <div>
                          <h3>{i.service}</h3>
                          <p>
                            <strong>
                              {i.state === "open" ? "Open" : "Recovered"}
                            </strong>
                            {isIncidents &&
                              selected === String(i.id) &&
                              " · Selected"}
                          </p>
                          {isIncidents ? (
                            <p>
                              Last spike: {pct(i.measurement.rate)} error-log
                              rate
                            </p>
                          ) : (
                            <>
                              <p>
                                Latest abnormal window:{" "}
                                {pct(i.measurement.rate)} observed /{" "}
                                {pct(i.measurement.expected)} expected error-log
                                rate
                              </p>
                              <p className="hint">
                                Measurement (UTC): {time(i.measurement.start)} →{" "}
                                {time(i.measurement.end)}
                              </p>
                              <p className="hint">
                                Incident interval (UTC): {time(i.start)} →{" "}
                                {time(i.end)}
                              </p>
                            </>
                          )}
                        </div>
                        <div>
                          <a
                            className="action-link"
                            id={`incident-${i.id}`}
                            href={viewUrl("incidents", {
                              incident: String(i.id),
                              run: data.run ?? null,
                              evaluation: null,
                            })}
                            aria-current={
                              isIncidents && selected === String(i.id)
                                ? "true"
                                : undefined
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
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
              {isIncidents && (
                <section
                  className="incident-pane"
                  hidden={!selected && data.incidents.length === 0}
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
                    <button id="back-to-incidents" onClick={() => select(null)}>
                      Back to incidents
                    </button>
                  )}
                  {selected && !incident && (
                    <p>
                      Incident unavailable in this dataset or no longer
                      retained.
                      <PageLink
                        href={`?view=overview&dataset=${dataset}`}
                        focus="queue-heading"
                      >
                        Return to current {dataset}
                      </PageLink>
                    </p>
                  )}
                  {!selected && (
                    <p>
                      Select an incident to compare its recorded measurement
                      with the baseline.
                    </p>
                  )}
                  {incident && (
                    <>
                      {incident.state === "recovered" && (
                        <p>
                          Selected incident recovered. Selection and evidence
                          remain available.
                        </p>
                      )}
                      <p className="recovery-status">{recoveryStatus}</p>
                      <details className="incident-background">
                        <summary>Incident timeline and baseline</summary>
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
                            windows / {incident.measurement.baseline_total}{" "}
                            events
                          </dd>
                          <dt>Threshold</dt>
                          <dd>
                            {pct(incident.measurement.threshold)} · observed
                            must exceed threshold
                          </dd>
                        </dl>
                        <p className="workspace-footnote">
                          Recorded measurements exclude later arrivals.
                          Detection is a statistical heuristic, not a
                          probability of failure.
                        </p>
                      </details>
                      <EvidencePane
                        key={`${dataset}-${selected}`}
                        dataset={dataset}
                        incident={selected!}
                        run={params.get("run") ?? data.run}
                        evaluation={params.get("evaluation")}
                        refreshKey={fetched ?? ""}
                      />
                    </>
                  )}
                </section>
              )}
            </div>
            {!isIncidents && (
              <section
                className="service-trends"
                aria-labelledby="trends-heading"
              >
                <h2 id="trends-heading">Service trends</h2>
                <p>
                  {dataset === "demo"
                    ? "Simulation time (UTC)"
                    : "Event time (UTC)"}{" "}
                  · Last 30 evaluated minutes. Volume is shown for context only.
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
                        <strong>
                          Latest window:{" "}
                          {service.status === "no spike detected"
                            ? "No spike"
                            : service.status === "spike detected"
                              ? "Spike detected"
                              : service.status === "learning baseline"
                                ? "Learning baseline"
                                : service.status}
                        </strong>{" "}
                        · {service.errors} ERROR/FATAL / {service.total} events
                        · {pct(service.rate)}
                      </p>
                      <p className="hint">
                        {time(service.start)} → {time(service.end)} (UTC).
                        Earlier spikes remain in the chart.
                      </p>
                      <div className="trend-pair">
                        <Trend rows={rows} />
                        <Trend rows={rows} volume />
                      </div>
                      <details>
                        <summary>
                          Evaluated windows for {service.service}
                        </summary>
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
            )}
          </>
        )}
        <p className="workspace-footnote">
          Logs and completed investigations are kept for seven days. Open
          investigations, their evidence, and pending deliveries are preserved.
          Demo uses simulation time.
        </p>
      </main>
    </div>
  );
}
