import { useRef, useState } from "react";

export function GeminiSetup({
  disabled,
  onChanged,
}: {
  disabled: boolean;
  onChanged: () => void;
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
      if (method !== "GET") {
        onChanged();
        setMessage(
          method === "PUT"
            ? "Key accepted for this server session. Create a new preview before sending."
            : "Session key cleared. An environment key, if present, remains the fallback. Create a new preview before sending.",
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
      {open && (
        <div id="gemini-settings">
          <p>
            <strong>
              {configured === null
                ? "Configuration not checked"
                : configured
                  ? "Configured"
                  : "Not configured"}
            </strong>
          </p>
          <p className="hint">
            Keys entered here stay only in server memory until cleared or the
            server stops. The server environment is the fallback. Saving a key
            does not send evidence or verify provider access.
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
                maxLength={256}
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
