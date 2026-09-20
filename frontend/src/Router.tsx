import { useEffect, useState } from "react";
import { Overview } from "./Overview";
import { Deliveries } from "./Deliveries";
import { App } from "./App";

export function Router() {
  const [search, setSearch] = useState(window.location.search);
  useEffect(() => {
    const update = () => setSearch(window.location.search);
    window.addEventListener("popstate", update);
    return () => window.removeEventListener("popstate", update);
  }, []);
  const params = new URLSearchParams(search);
  // Preserve bookmarks created before the overview introduced an explicit view.
  const legacyLogQuery =
    !params.has("view") &&
    ["service", "severity", "start", "end", "message", "page"].some((key) =>
      params.has(key),
    );
  const showLogs =
    params.get("view") === "logs" ||
    params.get("dataset") === "historical" ||
    legacyLogQuery;

  const destination =
    params.get("view") === "deliveries"
      ? "Deliveries"
      : showLogs
        ? "Logs"
        : params.get("view") === "incidents"
          ? "Incidents"
          : "Overview";
  useEffect(() => {
    document.title = `${destination} · Log Watchdog`;
  }, [destination]);

  if (params.get("view") === "deliveries")
    return (
      <Deliveries
        key={`${params.get("dataset")}:${params.get("incident")}:${params.get("run")}`}
      />
    );

  return showLogs ? (
    <App />
  ) : (
    <Overview key={params.get("dataset") ?? "demo"} />
  );
}
