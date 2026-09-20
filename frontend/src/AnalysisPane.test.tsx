import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import axe from "axe-core";
import { AnalysisPane } from "./AnalysisPane";

const preview = {
  preview_id: "preview-token",
  packet: '{"message":"token=[REDACTED]"}',
  provider: "Gemini",
  model: "gemini-3.5-flash-lite",
  synthetic_only: true,
  paid_service: false,
  references: {
    window: {
      dataset: "demo",
      incident: "1",
      evaluation: "91",
      run: "run-1",
      event_id: null,
    },
  },
};
const claim = {
  text: "<script>untrusted</script> may explain this pattern.",
  references: ["window"],
};
const result = {
  analysis: { summary: claim, possible_causes: [claim], next_checks: [claim] },
  references: preview.references,
};
const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  window.history.replaceState(
    {},
    "",
    "/?view=incidents&dataset=demo&incident=1&evaluation=91&run=run-1",
  );
});
function mount() {
  return render(
    <AnalysisPane dataset="demo" incident="1" evaluation={91} run="run-1" />,
  );
}
function reply(body: unknown, ok = true) {
  return { ok, json: async () => body };
}

it("previews locally, sends only the token after explicit activation and links hypotheses to pinned evidence", async () => {
  fetchMock
    .mockResolvedValueOnce(reply(preview))
    .mockResolvedValueOnce(reply(result));
  const user = userEvent.setup();
  const { container } = mount();
  expect(fetchMock).not.toHaveBeenCalled();
  await user.click(
    screen.getByRole("button", { name: "Preview evidence for analysis" }),
  );
  expect(await screen.findByText(preview.packet)).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
    evaluation: 91,
    run: "run-1",
  });
  expect(
    screen.getByText(/Basic redaction can miss secrets/),
  ).toBeInTheDocument();
  expect((await axe.run(container)).violations).toEqual([]);
  screen.getByRole("button", { name: "Send for analysis" }).focus();
  await user.keyboard("{Enter}");
  expect(
    await screen.findByText("Gemini hypotheses — verify with evidence"),
  ).toBeInTheDocument();
  expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({
    preview_id: "preview-token",
    confirm_send: true,
  });
  const href = screen
    .getAllByRole("link", { name: "Inspect evaluated window" })[0]
    .getAttribute("href")!;
  expect(href).toContain("evaluation=91");
  expect(href).toContain("run=run-1");
  expect(href).toContain("scope=evaluated");
  expect(container.querySelector("script")).toBeNull();
  expect(
    screen.getByRole("button", { name: "Send for analysis" }),
  ).toBeDisabled();
  expect((await axe.run(container)).violations).toEqual([]);
});

it("shows configuration failure and lets the local investigation continue", async () => {
  fetchMock.mockResolvedValue(
    reply(
      {
        detail:
          "Gemini is not configured. The local summary remains available.",
      },
      false,
    ),
  );
  const user = userEvent.setup();
  mount();
  await user.click(
    screen.getByRole("button", { name: "Preview evidence for analysis" }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Gemini is not configured",
  );
  expect(
    screen.queryByRole("button", { name: "Send for analysis" }),
  ).not.toBeInTheDocument();
  expect(window.location.search).toContain("incident=1");
});

it("keeps the exact preview on failure and requires another explicit send for retry", async () => {
  fetchMock
    .mockResolvedValueOnce(reply(preview))
    .mockResolvedValueOnce(
      reply({ detail: "Gemini rate limit reached." }, false),
    )
    .mockResolvedValueOnce(reply(result));
  const user = userEvent.setup();
  mount();
  await user.click(
    screen.getByRole("button", { name: "Preview evidence for analysis" }),
  );
  await user.click(
    await screen.findByRole("button", { name: "Send for analysis" }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent("rate limit");
  expect(screen.getByText(preview.packet)).toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent(
    "retry sends the same packet",
  );
  expect(fetchMock).toHaveBeenCalledTimes(2);
  await user.click(screen.getByRole("button", { name: "Send for analysis" }));
  expect(
    await screen.findByText("Gemini hypotheses — verify with evidence"),
  ).toBeInTheDocument();
  expect(fetchMock.mock.calls[2][1].body).toBe(fetchMock.mock.calls[1][1].body);
});

it("announces sending, disables duplicate submissions and aborts a departing context", async () => {
  let finish!: (value: unknown) => void;
  fetchMock.mockResolvedValueOnce(reply(preview)).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const user = userEvent.setup();
  const view = mount();
  await user.click(
    screen.getByRole("button", { name: "Preview evidence for analysis" }),
  );
  await user.click(
    await screen.findByRole("button", { name: "Send for analysis" }),
  );
  expect(screen.getByRole("status")).toHaveTextContent("Sending preview");
  expect(
    screen.getByRole("button", { name: "Send for analysis" }),
  ).toBeDisabled();
  const signal = fetchMock.mock.calls[1][1].signal;
  view.unmount();
  expect(signal.aborted).toBe(true);
  await act(async () => finish(reply(result)));
  mount();
  expect(
    screen.queryByText("Gemini hypotheses — verify with evidence"),
  ).not.toBeInTheDocument();
});

it("invalidates the visible preview after a session key change without sending evidence", async () => {
  fetchMock
    .mockResolvedValueOnce(reply(preview))
    .mockResolvedValueOnce(reply({ configured: false }))
    .mockResolvedValueOnce(reply({ configured: true }));
  const user = userEvent.setup();
  mount();
  await user.click(
    screen.getByRole("button", { name: "Preview evidence for analysis" }),
  );
  await screen.findByText(preview.packet);
  await user.click(screen.getByRole("button", { name: "Gemini setup" }));
  await screen.findByText("Not configured");
  await user.type(
    screen.getByLabelText("Gemini API key"),
    "synthetic-only-key",
  );
  await user.click(
    screen.getByRole("button", { name: "Use key for this session" }),
  );
  await screen.findByText("Configured");
  expect(screen.queryByText(preview.packet)).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Send for analysis" }),
  ).not.toBeInTheDocument();
  expect(
    fetchMock.mock.calls.some(([url]) => url === "/api/analysis/send"),
  ).toBe(false);
});

it("clears stale setup and preview errors after successful status refresh", async () => {
  fetchMock
    .mockResolvedValueOnce(reply({ configured: false }))
    .mockResolvedValueOnce({ ...reply({}, false), status: 422 })
    .mockResolvedValueOnce(
      reply({ detail: "Gemini is not configured." }, false),
    )
    .mockResolvedValueOnce(reply({ configured: true }))
    .mockResolvedValueOnce(reply(preview));
  const user = userEvent.setup();
  mount();
  await user.click(screen.getByRole("button", { name: "Gemini setup" }));
  await screen.findByText("Not configured");
  await user.type(screen.getByLabelText("Gemini API key"), "synthetic");
  await user.click(
    screen.getByRole("button", { name: "Use key for this session" }),
  );
  await screen.findByRole("alert");
  await user.click(
    screen.getByRole("button", { name: "Preview evidence for analysis" }),
  );
  await screen.findByText("Gemini is not configured.");
  await user.click(screen.getByRole("button", { name: "Refresh key status" }));
  await screen.findByText("Configured");
  expect(screen.queryAllByRole("alert")).toHaveLength(0);
  await user.click(
    screen.getByRole("button", { name: "Preview evidence for analysis" }),
  );
  expect(await screen.findByText(preview.packet)).toBeInTheDocument();
});

it("waits for key storage before enabling preview and clears previous errors on save", async () => {
  let finish!: (value: unknown) => void;
  fetchMock
    .mockResolvedValueOnce(
      reply({ detail: "Gemini is not configured." }, false),
    )
    .mockResolvedValueOnce(reply({ configured: false }))
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    )
    .mockResolvedValueOnce(reply(preview));
  const user = userEvent.setup();
  mount();
  await user.click(
    screen.getByRole("button", { name: "Preview evidence for analysis" }),
  );
  await screen.findByRole("alert");
  await user.click(screen.getByRole("button", { name: "Gemini setup" }));
  await screen.findByText("Not configured");
  const key = "AQ." + "synthetic".repeat(60);
  await user.type(screen.getByLabelText("Gemini API key"), key);
  await user.click(
    screen.getByRole("button", { name: "Use key for this session" }),
  );
  expect(JSON.parse(fetchMock.mock.calls[2][1].body)).toEqual({ key });
  expect(fetchMock.mock.calls[2][1]).toMatchObject({
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-Log-Watchdog-Settings": "1",
    },
  });
  expect(
    screen.getByRole("button", { name: "Preview evidence for analysis" }),
  ).toBeDisabled();
  await act(async () => finish(reply({ configured: true })));
  expect(await screen.findByText("Configured")).toBeInTheDocument();
  expect(screen.queryAllByRole("alert")).toHaveLength(0);
  await user.click(
    screen.getByRole("button", { name: "Preview evidence for analysis" }),
  );
  expect(await screen.findByText(preview.packet)).toBeInTheDocument();
  expect(
    fetchMock.mock.calls.some(([url]) => url === "/api/analysis/send"),
  ).toBe(false);
});
