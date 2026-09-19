import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Overview } from "./Overview";
import { App } from "./App";
import "./styles.css";

const params = new URLSearchParams(window.location.search);
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

createRoot(document.getElementById("root")!).render(
  <StrictMode>{showLogs ? <App /> : <Overview />}</StrictMode>,
);
