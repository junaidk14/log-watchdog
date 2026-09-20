import { useEffect, useRef, useState } from "react";
import { PageLink, viewUrl } from "./navigation";
import { GeminiSetup } from "./GeminiSetup";

type Reference = Record<string, string | null>;
type Preview = {
  preview_id: string;
  packet: string;
  provider: string;
  model: string;
  synthetic_only: boolean;
  paid_service: boolean;
  references: Record<string, Reference>;
};
type Claim = { text: string; references: string[] };
type Result = {
  analysis: { summary: Claim; possible_causes: Claim[]; next_checks: Claim[] };
  references: Record<string, Reference>;
};

export function AnalysisPane({
  dataset,
  incident,
  evaluation,
  run,
}: {
  dataset: string;
  incident: string;
  evaluation: number;
  run: string | null;
}) {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState<"preview" | "send" | null>(null);
  const [error, setError] = useState("");
  const [privacyBlocked, setPrivacyBlocked] = useState(false);
  const [setupBusy, setSetupBusy] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => active.current?.abort(), []);

  async function request(send: boolean) {
    if (active.current) return;
    const controller = new AbortController();
    active.current = controller;
    setBusy(send ? "send" : "preview");
    setError("");
    setPrivacyBlocked(false);
    if (!send) {
      setPreview(null);
      setResult(null);
      setAttempted(false);
    } else setAttempted(true);
    try {
      const response = await fetch(
        send
          ? "/api/analysis/send"
          : `/api/datasets/${dataset}/incidents/${incident}/analysis/preview`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify(
            send
              ? { preview_id: preview!.preview_id, confirm_send: true }
              : { evaluation, run },
          ),
        },
      );
      const body = await response.json();
      if (!response.ok) {
        if (!send && response.status === 403 && !controller.signal.aborted)
          setPrivacyBlocked(true);
        throw new Error(
          typeof body.detail === "string"
            ? body.detail
            : "Analysis unavailable. Retry or use the local summary.",
        );
      }
      if (!controller.signal.aborted) {
        if (send) setResult(body as Result);
        else setPreview(body as Preview);
      }
    } catch (reason) {
      if (!controller.signal.aborted)
        setError(
          reason instanceof Error
            ? reason.message
            : "Analysis unavailable. Retry or use the local summary.",
        );
    } finally {
      if (!controller.signal.aborted) {
        setBusy(null);
        active.current = null;
      }
    }
  }

  function claim(item: Claim, index: number) {
    return (
      <li key={index}>
        <p>{item.text}</p>
        {item.references.map((ref) => (
          <PageLink
            key={ref}
            href={viewUrl("logs", {
              ...result!.references[ref],
              scope: "evaluated",
              severity: null,
              message: null,
              page: "1",
            })}
            focus="logs-heading"
          >
            Inspect {ref === "window" ? "evaluated window" : ref}
          </PageLink>
        ))}
      </li>
    );
  }

  return (
    <section className="analysis-pane" aria-labelledby="analysis-heading">
      <h3 id="analysis-heading" tabIndex={-1}>
        Optional Gemini analysis
      </h3>
      <p>
        Preview a small evidence sample before choosing whether to send it. The
        local summary above works without Gemini credentials.
      </p>
      <GeminiSetup
        disabled={busy !== null}
        onBusyChange={setSetupBusy}
        onStatusRefreshed={() => {
          setError("");
          setPrivacyBlocked(false);
        }}
        onChanged={() => {
          setPreview(null);
          setResult(null);
          setAttempted(false);
          setError("");
          setPrivacyBlocked(false);
        }}
      />
      <button
        disabled={busy !== null || setupBusy}
        onClick={() => void request(false)}
      >
        {preview ? "Create new preview" : "Preview evidence for analysis"}
      </button>
      <p role="status">
        {busy === "preview"
          ? "Preparing preview locally…"
          : busy === "send"
            ? "Sending preview to Gemini…"
            : result
              ? "Analysis completed. Review these hypotheses against the evidence."
              : preview
                ? attempted
                  ? "Preview retained. A retry sends the same packet."
                  : "Preview ready. Nothing has been sent from this preview yet."
                : ""}
      </p>
      {error && (
        <div role="alert" className="error">
          {privacyBlocked ? (
            <>
              <strong>This evidence is not verified synthetic data</strong>
              <p>
                Your key is configured, but this window is not eligible for the
                unpaid analysis path. Nothing was sent to Gemini. The local
                evidence summary remains available.
              </p>
              {dataset === "demo" && (
                <>
                  <p>
                    Older Demo data may lack provenance. Reset Demo, then
                    advance one minute to create a fresh synthetic incident.
                    Reset deletes Demo logs, incidents and deliveries; Live and
                    Historical stay intact.
                  </p>
                  <PageLink
                    href="?view=overview&dataset=demo"
                    focus="reset-demo"
                  >
                    Open Demo reset
                  </PageLink>
                </>
              )}
              <p>
                For real or unverified logs, use a key linked to an active
                paid-service billing project and configure
                GEMINI_PAID_SERVICE=true on the server. This is a privacy
                requirement, not a key-validation failure.
              </p>
            </>
          ) : (
            error
          )}
        </div>
      )}
      {preview && (
        <>
          <h4>Exact evidence packet</h4>
          <p>
            {preview.provider} · {preview.model} ·{" "}
            {preview.synthetic_only
              ? "Verified synthetic Demo evidence"
              : "Real or unverified evidence"}{" "}
            ·{" "}
            {preview.paid_service
              ? "Paid-service configuration declared by server operator"
              : "Unpaid-service path"}
          </p>
          <p>
            Basic redaction can miss secrets in arbitrary messages. Review every
            value below before sending to Google. Metadata and original event
            IDs are omitted. Unpaid processing is restricted to verified
            synthetic Demo evidence; real logs require appropriate paid-service
            configuration.
          </p>
          <div
            role="region"
            aria-label="Exact evidence packet"
            tabIndex={0}
            className="analysis-packet"
          >
            <pre>{preview.packet}</pre>
          </div>
          <p>
            This frozen preview expires after 10 minutes or a server restart.
            New arrivals are not added. Each retry after a failure may send the
            same packet again.
          </p>
          <button
            disabled={busy !== null || setupBusy || result !== null}
            onClick={() => void request(true)}
          >
            Send for analysis
          </button>
        </>
      )}
      {result && (
        <>
          <h4>Gemini hypotheses — verify with evidence</h4>
          <p>
            Generated text may be wrong or follow misleading log content.
            References identify supplied evidence, not proof. This analysis does
            not change detection or alerts.
          </p>
          <ul>{claim(result.analysis.summary, 0)}</ul>
          <h4>Possible causes</h4>
          <ul>{result.analysis.possible_causes.map(claim)}</ul>
          <h4>Suggested next checks</h4>
          <ul>{result.analysis.next_checks.map(claim)}</ul>
        </>
      )}
    </section>
  );
}
