import { ThemeToggle } from "./ThemeToggle";
import { useEffect, useRef, useState } from "react";
import {
  useDocumentTitle,
  PageLink,
  usePageRestoration,
  viewUrl,
} from "./navigation";

type Attempt = {
  number: number;
  started_at: string;
  finished_at: string | null;
  status: number | null;
  error: string | null;
  duration_ms: number | null;
  duplicate: boolean;
};
type Notification = {
  id: string;
  incident_id: number;
  service: string;
  incident_state: string;
  kind: string;
  created_at: string;
  state: string;
  attempts_used: number;
  next_retry: string | null;
  behavior: string;
  destination: string;
  payload: unknown;
  attempts: Attempt[];
};
type DeliveryData = {
  deliveries: Notification[];
  max_attempts: number;
  run: string | null;
};

export function Deliveries() {
  useDocumentTitle("Deliveries");
  const params = new URLSearchParams(window.location.search);
  const dataset = params.get("dataset") ?? "demo";
  const incident = params.get("incident");
  const run = params.get("run");
  const [data, setData] = useState<DeliveryData | null>(null);
  const [error, setError] = useState("");
  const [fetched, setFetched] = useState("");
  const [retry, setRetry] = useState(0);
  const [announcement, setAnnouncement] = useState("");
  const previous = useRef<Map<string, string> | null>(null);
  usePageRestoration(data !== null || error !== "", "deliveries-heading", true);
  useEffect(() => {
    const controller = new AbortController();
    let active = false;
    async function load() {
      if (active) return;
      active = true;
      try {
        const query = new URLSearchParams();
        if (incident) query.set("incident", incident);
        if (run) query.set("run", run);
        const response = await fetch(
          `/api/datasets/${dataset}/deliveries?${query}`,
          { signal: controller.signal },
        );
        const body = await response.json();
        if (!response.ok)
          throw new Error(
            typeof body.detail === "string"
              ? body.detail
              : "Could not load deliveries. Retry refresh.",
          );
        if (controller.signal.aborted) return;
        const next = body as DeliveryData;
        const changed = next.deliveries.filter(
          (d) => previous.current?.get(d.id) !== d.state,
        );
        if (previous.current !== null && changed.length) {
          setAnnouncement(
            changed
              .map((d) => `${d.service} ${d.kind} notification: ${d.state}`)
              .join(". "),
          );
        }
        previous.current = new Map(next.deliveries.map((d) => [d.id, d.state]));
        setData(next);
        setFetched(new Date().toISOString());
        setError("");
      } catch (reason) {
        if (!controller.signal.aborted)
          setError(
            reason instanceof Error
              ? reason.message
              : "Delivery refresh failed. Retry.",
          );
      } finally {
        active = false;
      }
    }
    void load();
    const timer = window.setInterval(() => void load(), 1000);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [dataset, incident, run, retry]);
  return (
    <div className="workbench">
      <a href="#deliveries" className="skip-link">
        Skip to deliveries
      </a>
      <aside className="rail" aria-label="Workspace">
        <a className="brand" href="?view=overview&dataset=demo">
          Log Watchdog
        </a>
        <p className="local-label">Local workspace</p>
        <nav aria-label="Primary">
          <PageLink
            href={viewUrl("overview", {
              dataset: dataset === "historical" ? "live" : dataset,
            })}
            focus="overview-heading"
          >
            Overview
          </PageLink>
          {dataset !== "historical" && (
            <PageLink href={viewUrl("incidents")} focus="incident-heading" back>
              Incidents
            </PageLink>
          )}
          <PageLink href={viewUrl("logs")} focus="logs-heading">
            Logs
          </PageLink>
          <a href={viewUrl("deliveries")} aria-current="page">
            Deliveries
          </a>
        </nav>
      </aside>
      <main id="deliveries">
        <header className="page-header">
          <div>
            <h1 id="deliveries-heading" tabIndex={-1}>
              Deliveries
            </h1>
            <p>Track notifications and delivery attempts.</p>
          </div>
          <div className="header-controls">
            <label className="dataset-select">
              Dataset
              <select
                value={dataset}
                onChange={(event) => {
                  window.history.pushState(
                    { focus: "deliveries-heading" },
                    "",
                    `?view=deliveries&dataset=${event.target.value}`,
                  );
                  window.dispatchEvent(new PopStateEvent("popstate"));
                }}
              >
                <option value="demo">Demo</option>
                <option value="live">Live</option>
                <option value="historical">Historical</option>
              </select>
            </label>
            <ThemeToggle />
          </div>
        </header>
        <section className="dataset-context" aria-label="Delivery context">
          <strong>
            {dataset === "demo"
              ? "Demo · Simulated data"
              : dataset === "live"
                ? "Live"
                : "Historical"}
          </strong>
          <p>
            Times are UTC. Retries run in real time, independently of Demo
            advances.
          </p>
          {incident && (
            <>
              <p>
                Incident #{incident} · {params.get("service")} ·{" "}
                {params.get("start")} – {params.get("end")}
              </p>
              <PageLink
                href={viewUrl("incidents")}
                focus="incident-deliveries"
                back
              >
                Back to incident
              </PageLink>
            </>
          )}
          <button onClick={() => setRetry((v) => v + 1)}>
            Refresh deliveries
          </button>
          {fetched && <p>Last refreshed: {fetched}</p>}
        </section>
        <p role="status" className="sr-only">
          {announcement}
        </p>
        {error && (
          <div role="alert" className="error">
            <p>{error}</p>
            {data && (
              <p>Updates unavailable — showing results fetched at {fetched}.</p>
            )}
            <button onClick={() => setRetry((v) => v + 1)}>
              Retry refresh
            </button>
            <PageLink
              href="?view=overview&dataset=demo"
              focus="overview-heading"
            >
              Current demo
            </PageLink>
          </div>
        )}
        <div className="delivery-workspace">
          <section
            className="delivery-list"
            aria-label="Notification history"
            aria-busy={!data && !error}
          >
            {!data && !error && <p role="status">Loading deliveries…</p>}
            {data?.deliveries.length === 0 && (
              <>
                <h2>No notifications</h2>
                <p>
                  {dataset === "historical"
                    ? "Historical events do not trigger notifications."
                    : "Notifications appear when an incident opens or recovers. Older incidents may have no delivery history."}
                </p>
                <PageLink
                  href={viewUrl("overview", {
                    dataset: dataset === "historical" ? "live" : dataset,
                  })}
                  focus="overview-heading"
                >
                  Open overview
                </PageLink>
              </>
            )}
            {data?.deliveries.map((delivery) => (
              <DeliveryRow
                key={delivery.id}
                delivery={delivery}
                max={data.max_attempts}
                run={data.run}
              />
            ))}
          </section>
          {dataset === "demo" && <ReceiverControl />}
        </div>
      </main>
    </div>
  );
}

function ReceiverControl() {
  const [behavior, setBehavior] = useState("success");
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/demo/receiver", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok)
          throw new Error("Receiver settings unavailable. Retry settings.");
        return response.json();
      })
      .then((body) => {
        if (!controller.signal.aborted) {
          setBehavior(body.behavior);
          setReady(true);
          setError("");
        }
      })
      .catch((reason) => {
        if (!controller.signal.aborted) setError(String(reason));
      });
    return () => controller.abort();
  }, [retry]);
  return (
    <section
      id="receiver-controls"
      className="receiver-settings"
      aria-labelledby="receiver-heading"
    >
      <h2 id="receiver-heading" tabIndex={-1}>
        Demo receiver behavior
      </h2>
      <p>
        <PageLink href="?view=overview&dataset=demo" focus="reset-demo">
          Reset Demo
        </PageLink>
        , choose a receiver behavior, then advance one minute from{" "}
        <PageLink href="?view=overview&dataset=demo" focus="advance-demo">
          Overview
        </PageLink>
        .
      </p>
      <p>
        Applies to new Demo notifications, including their retries. Live always
        uses Success.
      </p>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          setSaving(true);
          setMessage("");
          setError("");
          try {
            const response = await fetch("/api/demo/receiver", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ behavior }),
            });
            if (!response.ok)
              throw new Error(
                "Could not save receiver behavior. Retry Save behavior.",
              );
            setMessage("Receiver behavior saved for new Demo notifications.");
          } catch (reason) {
            setError(String(reason));
          } finally {
            setSaving(false);
          }
        }}
      >
        <label>
          Receiver behavior
          <select
            disabled={!ready || saving}
            value={behavior}
            onChange={(event) => setBehavior(event.target.value)}
          >
            <option value="success">Success</option>
            <option value="fail-first-then-succeed">
              Fail first, then succeed
            </option>
            <option value="always-fail">Always fail</option>
          </select>
        </label>
        <button disabled={!ready || saving}>
          {saving ? "Saving…" : "Save behavior"}
        </button>
      </form>
      <p role="status">{message}</p>
      {error && (
        <p role="alert">
          {error}{" "}
          <button onClick={() => setRetry((v) => v + 1)}>Retry settings</button>
        </p>
      )}
    </section>
  );
}

function DeliveryRow({
  delivery: d,
  max,
  run,
}: {
  delivery: Notification;
  max: number;
  run: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const final = d.attempts.at(-1);
  return (
    <article className="delivery-row">
      <h2>
        {d.service} · {d.kind} notification
      </h2>
      <p>
        Incident {d.incident_state} · Notification {d.state} · {d.attempts_used}{" "}
        of {max} attempts used
      </p>
      <p>Created {d.created_at} · UTC</p>
      <PageLink
        href={viewUrl("incidents", {
          incident: String(d.incident_id),
          run,
          evaluation: null,
          service: d.service,
        })}
        focus="incident-heading"
      >
        Investigate incident #{d.incident_id}
      </PageLink>
      {d.next_retry && <p>Next retry: {d.next_retry} (UTC)</p>}
      {d.state === "exhausted" && (
        <div className="error">
          <p>
            {d.attempts_used} of {max} attempts used; no further retries
            scheduled.
          </p>
          <p>Final error: {final?.error ?? "Unknown outcome"}</p>
          <p>
            To repeat the Demo opening scenario, open{" "}
            <a href="?view=overview&dataset=demo">Demo Overview</a>, choose
            Reset demo, then Confirm reset Demo only. Reset clears Demo history
            and restores the receiver to Success; Live and Historical are
            unchanged.
          </p>
          <p>
            After resetting,{" "}
            <a href="?view=deliveries&dataset=demo#receiver-controls">
              choose Demo receiver behavior
            </a>
            , Save behavior, then return to Overview and Advance one minute.
          </p>
        </div>
      )}
      <button
        id={`delivery-${d.id}`}
        aria-expanded={expanded}
        aria-controls={`attempts-${d.id}`}
        aria-label={`${expanded ? "Hide" : "View"} payload and attempts for ${d.kind} notification #${d.incident_id}`}
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? "Hide" : "View"} payload and attempts
      </button>
      <div
        className="delivery-details"
        id={`attempts-${d.id}`}
        hidden={!expanded}
      >
        <p>Destination: {d.destination}</p>
        <p>Stable delivery ID: {d.id}</p>
        <p>
          Captured receiver behavior: {d.behavior} (demonstration setting,
          separate from outcomes)
        </p>
        <h3>Exact payload</h3>
        <pre>{JSON.stringify(d.payload, null, 2)}</pre>
        <h3>Attempts · UTC</h3>
        {d.attempts.length === 0 && <p>Pending first attempt.</p>}
        <ol>
          {d.attempts.map((attempt) => (
            <li key={attempt.number}>
              <strong>Attempt {attempt.number}</strong>
              <p>Started: {attempt.started_at}</p>
              <p>
                {attempt.finished_at
                  ? `Finished: ${attempt.finished_at}`
                  : "HTTP request in progress"}
              </p>
              <p>
                HTTP status: {attempt.status ?? "No response"} ·{" "}
                {attempt.error ??
                  (attempt.finished_at ? "Accepted" : "Awaiting outcome")}
              </p>
              <p>
                Duration:{" "}
                {attempt.duration_ms === null
                  ? "Unknown (interrupted or in progress)"
                  : `${attempt.duration_ms.toFixed(1)} ms`}
                {attempt.duplicate
                  ? " · Receiver recognized an already accepted delivery"
                  : ""}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </article>
  );
}
