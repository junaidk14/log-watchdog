import { useEffect, useState } from "react";
import { AnalysisPane } from "./AnalysisPane";
import { PageLink, viewUrl } from "./navigation";
import { Trend, type Measurement } from "./Overview";

export type EvidenceData = {
  deliveries?: { kind: string; state: string }[];
  run: string | null;
  measurement: Measurement;
  windows: Measurement[];
  evaluated_total: number;
  retained_total: number;
  evidence_missing: boolean;
  patterns: { message: string; count: number }[];
  sample: {
    event_id: string;
    timestamp: string;
    message: string;
    severity: string;
  }[];
};

export function EvidencePane({
  dataset,
  incident,
  run,
  evaluation,
  refreshKey,
}: {
  dataset: string;
  incident: string;
  run?: string | null;
  evaluation: string | null;
  refreshKey: string;
}) {
  const [data, setData] = useState<EvidenceData | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();
    if (run) params.set("run", run);
    if (evaluation) params.set("evaluation", evaluation);
    fetch(`/api/datasets/${dataset}/incidents/${incident}/evidence?${params}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          const body = await response.json();
          throw new Error(
            typeof body.detail === "string"
              ? body.detail
              : "Could not load evidence. Retry or select another window.",
          );
        }
        return response.json() as Promise<EvidenceData>;
      })
      .then((next) => {
        if (!controller.signal.aborted) {
          setData(next);
          setError("");
        }
      })
      .catch((reason) => {
        if (!controller.signal.aborted)
          setError(
            reason instanceof Error
              ? reason.message
              : "Evidence unavailable. Retry.",
          );
      });
    return () => controller.abort();
  }, [dataset, incident, run, evaluation, refreshKey, retry]);
  const url = (changes: Record<string, string | null> = {}) =>
    viewUrl("logs", {
      dataset,
      incident,
      run: data?.run ?? null,
      evaluation: String(data?.measurement.id),
      scope: "evaluated",
      service: data?.measurement.service ?? "",
      start: data?.measurement.start ?? "",
      end: data?.measurement.end ?? "",
      page: "1",
      event_id: null,
      ...changes,
    });
  const switching =
    evaluation !== null &&
    data !== null &&
    data.measurement.id !== Number(evaluation);
  return (
    <div className="evidence-pane" aria-busy={(!data || switching) && !error}>
      {error && (
        <div role="alert" className="error">
          <p>{error}</p>
          {data && <p>Showing previously fetched evidence for this window.</p>}
          <button onClick={() => setRetry((v) => v + 1)}>Retry evidence</button>
          <PageLink href="?view=overview&dataset=demo" focus="queue-heading">
            Current demo
          </PageLink>
        </div>
      )}
      {!data && !error && <p role="status">Loading evaluated evidence…</p>}
      {data && (
        <>
          <label>
            Evaluated window
            <select
              id="evaluated-window"
              value={evaluation ?? data.measurement.id}
              onChange={(event) => {
                const selectedWindow = data.windows.find(
                  (w) => String(w.id) === event.target.value,
                )!;
                window.history.pushState(
                  {
                    ...window.history.state,
                    focus: "evaluated-window",
                    scrollY: window.scrollY,
                  },
                  "",
                  viewUrl("incidents", {
                    evaluation: event.target.value,
                    service: selectedWindow.service,
                    start: selectedWindow.start,
                    end: selectedWindow.end,
                    page: "1",
                    event_id: null,
                  }),
                );
                window.dispatchEvent(
                  new PopStateEvent("popstate", {
                    state: window.history.state,
                  }),
                );
              }}
            >
              {data.windows.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.start} · {w.status}
                </option>
              ))}
            </select>
          </label>
          {switching && !error && <p role="status">Loading selected window…</p>}
          <div hidden={switching}>
            <p>
              {data.measurement.errors} ERROR/FATAL / {data.measurement.total}{" "}
              evaluated events ·{" "}
              {data.measurement.rate === null
                ? "Not evaluated"
                : `${(data.measurement.rate * 100).toFixed(2)}%`}{" "}
              observed · Expected{" "}
              {data.measurement.expected === null
                ? "Not evaluated"
                : `${(data.measurement.expected * 100).toFixed(2)}%`}{" "}
              · Threshold{" "}
              {data.measurement.threshold === null
                ? "Not evaluated"
                : `${(data.measurement.threshold * 100).toFixed(2)}%`}
            </p>
            <Trend rows={[data.measurement]} />
            {data.evidence_missing && (
              <p className="error">
                Evidence no longer available under the retention policy.{" "}
                {data.retained_total} of {data.evaluated_total} evaluated events
                remain; recorded measurements are unchanged.
              </p>
            )}
            <PageLink
              id="evaluated-logs"
              className="evidence-action"
              href={url()}
              focus="logs-heading"
            >
              View evaluated logs
            </PageLink>
            <h3>Notifications</h3>
            {data.deliveries?.length ? (
              data.deliveries.map((d) => (
                <p key={d.kind}>
                  {d.kind}: {d.state}
                </p>
              ))
            ) : (
              <p>No notifications recorded.</p>
            )}
            <PageLink
              id="incident-deliveries"
              href={url().replace("view=logs", "view=deliveries")}
              focus="deliveries-heading"
            >
              View delivery history
            </PageLink>
            <p>Delivery attempts and retries use real time (UTC).</p>
            <h3>Repeated error patterns</h3>
            <p className="hint">
              Exact message matches in this evaluated window; up to 10 patterns.
            </p>
            {data.patterns.length ? (
              <ul>
                {data.patterns.map((pattern, index) => (
                  <li key={pattern.message}>
                    <PageLink
                      id={`pattern-${index}`}
                      href={url({ message: pattern.message, severity: null })}
                      focus="logs-heading"
                    >
                      {pattern.message}
                    </PageLink>{" "}
                    · {pattern.count} ERROR/FATAL events
                  </li>
                ))}
              </ul>
            ) : (
              <p>No retained ERROR/FATAL patterns in this window.</p>
            )}
            <h3>Local evidence summary</h3>
            <p>
              Non-LLM analysis. The recorded window contains{" "}
              {data.measurement.errors} ERROR/FATAL events among{" "}
              {data.measurement.total} events.{" "}
              {data.measurement.status === "spike detected"
                ? "The observed error-log rate exceeded its service-specific baseline threshold."
                : "This window did not establish a new spike."}{" "}
              This is evidence of changed log behavior, not a definitive root
              cause.
            </p>
            <p>
              Next checks:{" "}
              <PageLink
                id="summary-errors"
                href={url({ severity: "ERROR", message: null })}
                focus="logs-heading"
              >
                inspect ERROR logs
              </PageLink>
              ,{" "}
              <PageLink
                id="summary-fatal"
                href={url({ severity: "FATAL", message: null })}
                focus="logs-heading"
              >
                inspect FATAL logs
              </PageLink>
              , then compare message details and surrounding evaluated events
              with recent service changes.
            </p>
            <h3>Sample of evaluated logs</h3>
            <p>
              {data.sample.length} representative events, errors first; this
              sample is not the complete denominator.
            </p>
            <ul>
              {data.sample.map((event, index) => (
                <li key={event.event_id}>
                  <p>
                    {event.timestamp} · {event.severity} · {event.message}
                  </p>
                  <PageLink
                    id={`sample-${index}`}
                    href={url({
                      event_id: event.event_id,
                      severity: null,
                      message: null,
                    })}
                    focus="logs-heading"
                  >
                    Inspect event {event.event_id}
                  </PageLink>
                </li>
              ))}
            </ul>
            {!switching && !error && (
              <AnalysisPane
                key={`${dataset}:${incident}:${data.run}:${data.measurement.id}`}
                dataset={dataset}
                incident={incident}
                evaluation={data.measurement.id}
                run={data.run}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
