import { useEffect, useState } from "react";
import { Overview } from "./Overview";
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

  return showLogs ? (
    <App />
  ) : (
    <Overview key={params.get("dataset") ?? "demo"} />
  );
}
