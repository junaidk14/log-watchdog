import { useRef, useState } from "react";

export function GeminiSetup({
  disabled,
  onChanged,
  onStatusRefreshed,
  onBusyChange,
}: {
  disabled: boolean;
  onChanged: () => void;
  onStatusRefreshed?: () => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function request(method: "GET" | "PUT" | "DELETE") {
    if (busy) return;
    setBusy(true);
    onBusyChange?.(true);
    setError("");
    setMessage("");
    // Keep the typed value out of React state and clear the field before awaiting.
    const body =
      method === "PUT"
        ? JSON.stringify({ key: input.current?.value.trim() ?? "" })
        : undefined;
    if (input.current) input.current.value = "";
    try {
      const response = await fetch("/api/analysis/key", {
        method,
        headers: {
          "Content-Type": "application/json",
          "X-Log-Watchdog-Settings": "1",
        },
        cache: "no-store",
        body,
      });
      if (!response.ok) {
        setConfigured(null);
        setError(
          response.status === 409
            ? "Analysis is sending. Wait for it to finish before changing keys."
            : "Could not update or read Gemini setup. Check the local server and enter a valid key to retry.",
        );
        return;
      }
      const status = await response.json();
      if (typeof status.configured !== "boolean") throw new Error();
      setConfigured(status.configured);
      if (method === "GET") onStatusRefreshed?.();
      if (method !== "GET") {
        onChanged();
        setMessage(
          method === "PUT"
            ? "Key set for this session. Create a new preview before sending."
            : "Session key cleared. Any server environment key still applies. Create a new preview before sending.",
        );
      }
    } catch {
      // Never display request values, transport exceptions or response bodies.
      setError(
        "Gemini setup is unavailable. Retry when the local server is reachable.",
      );
      setConfigured(null);
    } finally {
      setBusy(false);
      onBusyChange?.(false);
    }
  }

  return (
    <div className="gemini-setup">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="gemini-settings"
        disabled={disabled || busy}
        onClick={() => {
          if (input.current) input.current.value = "";
          setOpen(!open);
          if (!open) void request("GET");
        }}
      >
        Gemini setup
      </button>
      <p className="key-status" aria-live="polite">
        <strong>
          {configured === null
            ? "Open setup to check key status."
            : configured
              ? "Configured"
              : "Not configured"}
        </strong>
        {" · "}
        <a
          href="https://aistudio.google.com/apikey"
          target="_blank"
          rel="noopener noreferrer"
        >
          Get Gemini API key
        </a>
      </p>
      {open && (
        <div id="gemini-settings">
          <p className="hint">
            Your key stays only in server memory until cleared or the server
            stops. Clear key restores any environment key. Saving does not send
            evidence or check Gemini access.
          </p>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void request("PUT");
            }}
            autoComplete="off"
          >
            <label>
              Gemini API key
              <input
                ref={input}
                type="password"
                autoComplete="off"
                spellCheck={false}
                autoCapitalize="none"
                maxLength={2048}
                required
                disabled={busy || disabled}
              />
            </label>
            <button disabled={busy || disabled}>
              Use key for this session
            </button>
            <button
              type="button"
              disabled={busy || disabled}
              onClick={() => void request("DELETE")}
            >
              Clear key
            </button>
          </form>
          <button
            type="button"
            disabled={busy || disabled}
            onClick={() => void request("GET")}
          >
            Refresh key status
          </button>
          <p role="status">{busy ? "Updating Gemini setup…" : message}</p>
          {error && <p role="alert">{error}</p>}
        </div>
      )}
    </div>
  );
}
