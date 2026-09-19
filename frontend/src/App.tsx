import { Fragment, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";

type Dataset = "demo" | "live" | "historical";
type Filters = {
  dataset: string;
  service: string;
  severity: string;
  start: string;
  end: string;
  message: string;
  page: number;
};
type LogEvent = {
  sequence: number;
  event_id: string;
  timestamp: string;
  service: string;
  severity: string;
  message: string;
  metadata: Record<string, unknown>;
  ingested_at: string;
};
type Results = {
  dataset: Dataset;
  total: number;
  page: number;
  page_size: number;
  events: LogEvent[];
};
const datasets = ["demo", "live", "historical"];
const severities = ["DEBUG", "INFO", "WARNING", "ERROR", "FATAL"];

function readFilters(): Filters {
  const params = new URLSearchParams(window.location.search);
  return {
    dataset: params.get("dataset") ?? "demo",
    service: params.get("service") ?? "",
    severity: params.get("severity") ?? "",
    start: params.get("start") ?? "",
    end: params.get("end") ?? "",
    message: params.get("message") ?? "",
    page: Number(params.get("page") ?? 1),
  };
}
function encodeFilters(filters: Filters): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== "") params.set(key, String(value));
  });
  return params.toString();
}
function filterError(filters: Filters): string | null {
  if (!datasets.includes(filters.dataset))
    return "Unknown dataset. Choose Demo, Live, or Historical.";
  if (filters.severity && !severities.includes(filters.severity))
    return "Unknown severity. Choose a listed severity.";
  if (
    !Number.isSafeInteger(filters.page) ||
    filters.page < 1 ||
    filters.page > 10000000
  )
    return "Invalid page. Clear filters to return to page 1.";
  for (const value of [filters.start, filters.end]) {
    if (
      value &&
      (!/^\d{4}-\d\d-\d\dT\d\d:\d\d(:\d\d(\.\d+)?)?Z$/.test(value) ||
        Number.isNaN(Date.parse(value)))
    ) {
      return "Use UTC time in ISO format, for example 2026-01-01T11:30:00Z.";
    }
  }
  if (
    filters.start &&
    filters.end &&
    Date.parse(filters.start) > Date.parse(filters.end)
  )
    return "Start time must be at or before end time.";
  return null;
}
function timeLabel(timestamp: string): string {
  return timestamp.replace("T", " ").replace(/\.\d+Z$/, "Z");
}

export function App() {
  const [filters, setFilters] = useState<Filters>(readFilters);
  const [draft, setDraft] = useState<Filters>(filters);
  const [results, setResults] = useState<Results | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const restoreScroll = useRef<number | null>(null);
  const query = encodeFilters(filters);
  useEffect(() => {
    const previousRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    const onBack = (event: PopStateEvent) => {
      restoreScroll.current = Number(event.state?.scrollY ?? 0);
      const next = readFilters();
      setFilters(next);
      setDraft(next);
      setExpanded(new Set());
      setResults(null);
      setError(null);
      setLoading(true);
      setRevision((current) => current + 1);
    };
    window.addEventListener("popstate", onBack);
    return () => {
      window.removeEventListener("popstate", onBack);
      window.history.scrollRestoration = previousRestoration;
    };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    const invalid = filterError(filters);
    if (invalid) {
      setError(invalid);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const params = new URLSearchParams(query);
    params.delete("dataset");
    params.set("page_size", "50");
    fetch(`/api/datasets/${filters.dataset}/events?${params}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          if (response.status === 422)
            throw new Error(
              "The server rejected these filters. Check the values and apply again.",
            );
          throw new Error(
            `Could not load logs (HTTP ${response.status}). Check the local server and retry.`,
          );
        }
        return response.json() as Promise<Results>;
      })
      .then((data) => {
        if (!controller.signal.aborted) {
          setResults(data);
          setFetchedAt(new Date().toISOString());
        }
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted)
          setError(
            reason instanceof Error
              ? reason.message
              : "Connection failed. Check the local server and retry.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
    // The canonical query covers every filter; revision explicitly retries the same query.
  }, [query, revision]);

  useEffect(() => {
    if (
      !loading &&
      (results !== null || error !== null) &&
      restoreScroll.current !== null
    ) {
      window.scrollTo(0, restoreScroll.current);
      restoreScroll.current = null;
    }
  }, [loading, results, error]);

  function navigate(next: Filters) {
    if (encodeFilters(next) === query) {
      setDraft(next);
      setRevision((current) => current + 1);
      return;
    }
    setLoading(true);
    setError(null);
    window.history.replaceState(
      { scrollY: window.scrollY },
      "",
      window.location.href,
    );
    window.history.pushState({}, "", `?${encodeFilters(next)}`);
    setFilters(next);
    setDraft(next);
    setResults(null);
    setExpanded(new Set());
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    navigate({ ...draft, page: 1 });
  }
  function clear() {
    navigate({
      dataset: datasets.includes(filters.dataset) ? filters.dataset : "demo",
      service: "",
      severity: "",
      start: "",
      end: "",
      message: "",
      page: 1,
    });
  }
  function toggle(id: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function page(number: number) {
    navigate({ ...filters, page: number });
    heading.current?.focus();
  }
  const pages = results
    ? Math.max(1, Math.ceil(results.total / results.page_size))
    : 1;

  return (
    <div className="workbench">
      <a href="#logs" className="skip-link">
        Skip to logs
      </a>
      <aside className="rail" aria-label="Workspace">
        <a className="brand" href="?dataset=demo">
          Log Watchdog
        </a>
        <p className="local-label">Local workspace</p>
        <nav aria-label="Primary">
          <a href={`?${query}`} aria-current="page">
            Logs
          </a>
        </nav>
        <p className="rail-note">
          Structured events.
          <br />
          Evidence you can inspect.
        </p>
      </aside>
      <main id="logs">
        <header className="page-header">
          <div>
            <h1 ref={heading} tabIndex={-1}>
              Logs
            </h1>
            <p>Explore events across a service, interval, or message.</p>
          </div>
          <label className="dataset-select">
            Dataset
            <select
              value={draft.dataset}
              onChange={(e) =>
                navigate({ ...filters, dataset: e.target.value, page: 1 })
              }
            >
              {!datasets.includes(draft.dataset) && (
                <option value={draft.dataset}>Unknown dataset</option>
              )}
              <option value="demo">Demo</option>
              <option value="live">Live</option>
              <option value="historical">Historical</option>
            </select>
          </label>
        </header>
        <div className="dataset-context">
          <strong>
            {filters.dataset === "demo"
              ? "Demo · Synthetic history"
              : filters.dataset === "live"
                ? "Live · API events"
                : filters.dataset === "historical"
                  ? "Historical · Stored events"
                  : "Unknown dataset"}
          </strong>
          <span>
            {filters.dataset === "demo"
              ? "Simulation time (UTC). Seeded normal activity from three services."
              : filters.dataset === "live"
                ? "Event time (UTC). Only events sent to the live dataset appear here."
                : "Event time (UTC). Historical data is separate from live activity."}
          </span>
        </div>
        <section className="explorer" aria-label="Log explorer">
          <form onSubmit={submit} className="filters" aria-label="Filter logs">
            <label>
              Service
              <input
                value={draft.service}
                maxLength={120}
                placeholder="All services"
                onChange={(e) =>
                  setDraft({ ...draft, service: e.target.value })
                }
              />
            </label>
            <label>
              Severity
              <select
                value={draft.severity}
                onChange={(e) =>
                  setDraft({ ...draft, severity: e.target.value })
                }
              >
                <option value="">All severities</option>
                {draft.severity && !severities.includes(draft.severity) && (
                  <option value={draft.severity}>Unknown severity</option>
                )}
                {severities.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label>
              From (UTC)
              <input
                value={draft.start}
                placeholder="2026-01-01T11:30:00Z"
                aria-describedby="time-help"
                onChange={(e) => setDraft({ ...draft, start: e.target.value })}
              />
            </label>
            <label>
              To (UTC)
              <input
                value={draft.end}
                placeholder="2026-01-01T12:00:00Z"
                aria-describedby="time-help"
                onChange={(e) => setDraft({ ...draft, end: e.target.value })}
              />
            </label>
            <label className="message-filter">
              Message contains
              <input
                value={draft.message}
                maxLength={16384}
                placeholder="Search message text"
                onChange={(e) =>
                  setDraft({ ...draft, message: e.target.value })
                }
              />
            </label>
            <div className="filter-actions">
              <button className="primary" type="submit">
                Apply filters
              </button>
              <button type="button" onClick={clear}>
                Clear filters
              </button>
            </div>
            <p id="time-help" className="hint">
              Use ISO UTC timestamps ending in Z. Both time boundaries are
              inclusive.
            </p>
          </form>
          <div className="result-toolbar">
            <p role="status">
              {loading
                ? "Loading logs…"
                : results
                  ? `${results.total.toLocaleString()} matching events · Page ${results.page} of ${pages}`
                  : "Logs unavailable"}
            </p>
            <button
              type="button"
              onClick={() => setRevision(revision + 1)}
              disabled={loading}
            >
              Refresh
            </button>
          </div>
          {error && (
            <div role="alert" className="error">
              <strong>Logs could not be updated</strong>
              <p>{error}</p>
              {results && <p>Showing results fetched at {fetchedAt}.</p>}
              <button type="button" onClick={() => setRevision(revision + 1)}>
                Retry
              </button>
            </div>
          )}
          {loading && !results && (
            <div className="loading" aria-hidden="true">
              <div />
              <div />
              <div />
            </div>
          )}
          {!loading && results?.total === 0 && (
            <div className="empty">
              <h2>No matching logs</h2>
              <p>
                {filters.dataset === "live"
                  ? "Send events to the live ingestion API, or clear filters to see all stored live events."
                  : "Try a broader interval or clear filters to see all events in this dataset."}
              </p>
              <button type="button" onClick={clear}>
                Clear filters and view all
              </button>
            </div>
          )}
          {results && results.total > 0 && (
            <div
              className="table-scroll"
              tabIndex={0}
              role="region"
              aria-label="Log results, scroll horizontally for all columns"
              aria-busy={loading}
            >
              <table>
                <caption className="sr-only">
                  {filters.dataset} logs, newest first. Expand an event to read
                  its full message and metadata.
                </caption>
                <thead>
                  <tr>
                    <th scope="col">
                      {filters.dataset === "demo"
                        ? "Simulation time (UTC)"
                        : "Event time (UTC)"}
                    </th>
                    <th scope="col">Severity</th>
                    <th scope="col">Service</th>
                    <th scope="col">Message</th>
                    <th scope="col">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {results.events.map((log) => (
                    <Fragment key={log.event_id}>
                      <tr
                        className={
                          expanded.has(log.event_id) ? "expanded-row" : ""
                        }
                      >
                        <td className="timestamp">
                          {timeLabel(log.timestamp)}
                        </td>
                        <td>
                          <span
                            className={`severity severity-${log.severity.toLowerCase()}`}
                          >
                            {log.severity}
                          </span>
                        </td>
                        <td className="service">{log.service}</td>
                        <td className="message-cell">
                          <span>{log.message}</span>
                        </td>
                        <td>
                          <button
                            type="button"
                            aria-label={`${expanded.has(log.event_id) ? "Collapse" : "Expand"} event ${log.event_id}`}
                            aria-expanded={expanded.has(log.event_id)}
                            aria-controls={`event-${log.sequence}`}
                            onClick={() => toggle(log.event_id)}
                          >
                            {expanded.has(log.event_id) ? "Collapse" : "Expand"}
                          </button>
                        </td>
                      </tr>
                      <tr hidden={!expanded.has(log.event_id)}>
                        <td colSpan={5}>
                          <div
                            id={`event-${log.sequence}`}
                            className="event-detail"
                          >
                            {expanded.has(log.event_id) && (
                              <dl>
                                <dt>Event ID</dt>
                                <dd>{log.event_id}</dd>
                                <dt>Full message</dt>
                                <dd>{log.message}</dd>
                                <dt>Ingested at (real UTC)</dt>
                                <dd>{log.ingested_at}</dd>
                                <dt>Metadata</dt>
                                <dd>
                                  <pre>
                                    {JSON.stringify(log.metadata, null, 2)}
                                  </pre>
                                </dd>
                              </dl>
                            )}
                          </div>
                        </td>
                      </tr>
                    </Fragment>
                  ))}
                </tbody>
              </table>
              {!results.events.length && (
                <p className="empty">
                  This page no longer has events. Return to the first page.
                </p>
              )}
            </div>
          )}
          <footer className="pagination">
            <span>Newest first · 50 events per page</span>
            <div>
              <button
                type="button"
                disabled={filters.page === 1 || loading}
                onClick={() => page(1)}
              >
                First
              </button>
              <button
                type="button"
                disabled={filters.page <= 1 || loading}
                onClick={() => page(filters.page - 1)}
              >
                Previous
              </button>
              <button
                type="button"
                disabled={!results || filters.page >= pages || loading}
                onClick={() => page(filters.page + 1)}
              >
                Next
              </button>
            </div>
          </footer>
        </section>
        <p className="workspace-footnote">
          Stored locally in SQLite. Dataset boundaries keep demo, live, and
          historical events separate.
        </p>
      </main>
    </div>
  );
}
