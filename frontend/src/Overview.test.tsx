import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import axe from "axe-core";
import { Overview, Trend, type OverviewData } from "./Overview";

const measurement = {
  id: 1,
  service: "checkout",
  start: "2026-01-01T12:00:00Z",
  end: "2026-01-01T12:01:00Z",
  total: 40,
  errors: 16,
  rate: 0.4,
  expected: 0.000416,
  threshold: 0.050416,
  baseline_total: 1200,
  baseline_count: 30,
  status: "spike detected",
};
const data: OverviewData = {
  dataset: "demo",
  delayed: false,
  server_time: "2026-09-19T20:00:00Z",
  progress: {
    clock: "2026-01-01T12:01:10Z",
    steps: 1,
    next_start: "2026-01-01T12:01:00Z",
    last_success: "2026-01-01T12:01:10Z",
  },
  services: [measurement],
  trends: [measurement],
  incidents: [
    {
      id: 1,
      service: "checkout",
      state: "open",
      start: measurement.start,
      end: measurement.end,
      recovery_streak: 0,
      recovered_at: null,
      measurement,
    },
  ],
  config: {
    recovery_windows: 3,
    grace_seconds: 10,
    minimum_events: 20,
    minimum_baseline_windows: 10,
  },
};
const fetchMock = vi.fn();
function respond(value = data) {
  return Promise.resolve({
    ok: true,
    json: async () => structuredClone(value),
  } as Response);
}
beforeEach(() => {
  window.history.replaceState({}, "", "/?view=overview&dataset=demo");
  vi.stubGlobal("scrollTo", vi.fn());
  vi.stubGlobal("scrollY", 0);
  fetchMock.mockReset();
  fetchMock.mockImplementation(() => respond());
  vi.stubGlobal("fetch", (url: string, ...args: unknown[]) => {
    if (String(url).includes("/evidence"))
      return Promise.resolve({
        ok: true,
        json: async () => ({
          run: "demo-run",
          measurement,
          windows: [measurement],
          evaluated_total: 40,
          retained_total: 40,
          evidence_missing: false,
          patterns: [{ message: "Downstream timeout", count: 16 }],
          sample: [],
        }),
      });
    return fetchMock(url, ...args);
  });
});

it("selects with keyboard, preserves selection through recovery and returns focus", async () => {
  const user = userEvent.setup();
  render(<Overview />);
  const link = await screen.findByRole("link", {
    name: "Investigate checkout incident #1",
  });
  const focusHeading = vi.spyOn(HTMLElement.prototype, "focus");
  const revealHeading = vi.fn(() => vi.stubGlobal("scrollY", 123));
  vi.stubGlobal("scrollY", 330);
  HTMLElement.prototype.scrollIntoView = revealHeading;
  link.focus();
  await user.keyboard("{Enter}");
  await waitFor(() =>
    expect(
      screen.getByRole("heading", { name: "checkout · open" }),
    ).toHaveFocus(),
  );
  expect(focusHeading).toHaveBeenLastCalledWith({ preventScroll: true });
  expect(revealHeading).toHaveBeenCalledWith({
    block: "nearest",
    behavior: "instant",
  });
  expect(window.history.state.scrollY).toBe(123);
  focusHeading.mockRestore();
  delete (HTMLElement.prototype as Partial<HTMLElement>).scrollIntoView;
  expect(window.location.search).toContain("incident=1");
  expect(link).toHaveAttribute("aria-current", "true");
  expect(
    screen.getByText(/16 ERROR\/FATAL \/ 40 events/, { selector: "dd" }),
  ).toBeInTheDocument();
  const recovered = structuredClone(data);
  recovered.incidents[0].state = "recovered";
  recovered.incidents[0].recovered_at = "2026-01-01T12:05:00Z";
  fetchMock.mockImplementation(() => respond(recovered));
  await user.click(screen.getByRole("button", { name: "Refresh incidents" }));
  expect(
    await screen.findByRole("heading", { name: "checkout · recovered" }),
  ).toBeInTheDocument();
  expect(window.location.search).toContain("incident=1");
  await user.click(screen.getByRole("button", { name: "Back to incidents" }));
  await waitFor(() => expect(link).toHaveFocus());
  expect(window.location.search).not.toContain("incident=");
  await act(async () => {
    window.history.back();
  });
  await waitFor(() =>
    expect(
      screen.getByRole("heading", { name: "checkout · recovered" }),
    ).toHaveFocus(),
  );
});

it("retains values and selected detail on refresh error and retries", async () => {
  window.history.replaceState(
    {},
    "",
    "/?view=incidents&dataset=demo&incident=1",
  );
  const user = userEvent.setup();
  render(<Overview />);
  await screen.findByRole("heading", { name: "checkout · open" });
  fetchMock.mockRejectedValueOnce(new Error("Local server offline"));
  await user.click(screen.getByRole("button", { name: "Refresh incidents" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Showing results fetched at",
  );
  expect(
    screen.getByRole("heading", { name: "checkout · open" }),
  ).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Retry refresh" }));
  await waitFor(() =>
    expect(screen.queryByRole("alert")).not.toBeInTheDocument(),
  );
});

it("advances once while busy and reports unknown outcome without dropping evidence", async () => {
  const user = userEvent.setup();
  render(<Overview />);
  const button = await screen.findByRole("button", {
    name: "Advance one minute",
  });
  await screen.findByText("Service trends");
  let reject!: (reason: Error) => void;
  fetchMock.mockReturnValueOnce(
    new Promise((_, no) => {
      reject = no;
    }),
  );
  await user.click(button);
  expect(screen.getByRole("button", { name: "Advancing…" })).toBeDisabled();
  await act(async () =>
    reject(new Error("Connection lost; refresh to check simulation time")),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent("Connection lost");
  expect(
    screen.getByRole("link", { name: "Investigate checkout incident #1" }),
  ).toBeInTheDocument();
  expect(fetchMock).toHaveBeenLastCalledWith("/api/demo/advance", {
    method: "POST",
  });
});

it("renders loading, initial failure, retry and honest empty live baseline", async () => {
  window.history.replaceState({}, "", "/?view=overview&dataset=live");
  let reject!: (reason: Error) => void;
  fetchMock.mockReturnValueOnce(
    new Promise((_, no) => {
      reject = no;
    }),
  );
  render(<Overview />);
  expect(screen.getByText("Loading overview…")).toBeInTheDocument();
  await act(async () => reject(new Error("Offline")));
  expect(await screen.findByRole("alert")).toHaveTextContent("Offline");
  fetchMock.mockImplementation(() =>
    respond({
      ...data,
      dataset: "live",
      incidents: [],
      services: [],
      trends: [],
    }),
  );
  await userEvent
    .setup()
    .click(screen.getByRole("button", { name: "Retry refresh" }));
  expect(
    await screen.findByText(/Learning baseline. Send live events/),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Advance one minute" }),
  ).not.toBeInTheDocument();
  expect(screen.getByText(/No active incidents/)).toBeInTheDocument();
  expect(
    screen.queryByRole("table", { name: "Incident queue" }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("heading", { name: "Select an incident" }),
  ).not.toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: "local ingestion API" }),
  ).toHaveAttribute("href", "/docs");
});

it("shows one recorded window as an honest comparison and keeps volume non-anomalous", () => {
  const { container, rerender } = render(<Trend rows={[measurement]} />);
  expect(
    screen.getByText("Error-log rate · evaluated window"),
  ).toBeInTheDocument();
  expect(screen.getByText("40.00%")).toBeInTheDocument();
  expect(screen.getByText("0.04%")).toBeInTheDocument();
  expect(screen.getByText("5.04%")).toBeInTheDocument();
  expect(screen.queryByRole("img")).not.toBeInTheDocument();
  rerender(<Trend rows={[measurement]} volume />);
  expect(screen.getByRole("img")).toHaveAccessibleName(/volume/);
  expect(container.querySelector(".chart-abnormal")).toBeNull();
  rerender(
    <Trend
      rows={[
        measurement,
        {
          ...measurement,
          id: 2,
          rate: null,
          expected: null,
          threshold: null,
          total: 0,
          errors: 0,
          status: "insufficient traffic",
        },
      ]}
    />,
  );
  expect(container.querySelectorAll("circle")).toHaveLength(1);
  expect(container.querySelector("path.chart-observed")).toBeNull();
  expect(screen.getByText("Latest: Not evaluated")).toBeInTheDocument();
});

it("shows sparse recovery, delayed live windows and exact chart values accessibly", async () => {
  window.history.replaceState(
    {},
    "",
    "/?view=incidents&dataset=live&incident=1",
  );
  fetchMock.mockImplementation(() =>
    respond({
      ...data,
      dataset: "live",
      delayed: true,
      services: [
        {
          ...measurement,
          rate: null,
          total: 0,
          errors: 0,
          status: "insufficient traffic",
        },
      ],
    }),
  );
  const { container } = render(<Overview />);
  expect(
    await screen.findByText(/Waiting for sufficient traffic/),
  ).toBeInTheDocument();
  expect(
    screen.getByText(/Evaluation delayed for window starting/),
  ).toBeInTheDocument();
  await userEvent.setup().click(screen.getByRole("link", { name: "Overview" }));
  await screen.findByText("Service trends");
  await userEvent
    .setup()
    .click(screen.getByText("Evaluated windows for checkout"));
  expect(
    screen.getByRole("table", { name: /Exact chart values/ }),
  ).toHaveTextContent("40.00%");
  const report = await axe.run(container, {
    rules: { "color-contrast": { enabled: false } },
  });
  expect(report.violations).toEqual([]);
});

it("does not let an older refresh overwrite an advance result", async () => {
  const user = userEvent.setup();
  render(<Overview />);
  await screen.findByText("Service trends");
  let resolve!: (value: Response) => void;
  fetchMock.mockReturnValueOnce(
    new Promise<Response>((yes) => {
      resolve = yes;
    }),
  );
  await user.click(screen.getByRole("button", { name: "Refresh overview" }));
  const next = structuredClone(data);
  next.progress.clock = "2026-01-01T12:02:10Z";
  fetchMock.mockImplementation(() => respond(next));
  await user.click(screen.getByRole("button", { name: "Advance one minute" }));
  await screen.findByText(/Simulation time \(UTC\): 2026-01-01 12:02:10Z/);
  await act(async () => resolve(await respond(data)));
  expect(
    screen.getByText(/Simulation time \(UTC\): 2026-01-01 12:02:10Z/),
  ).toBeInTheDocument();
});

it("announces refresh-driven incident transitions once without moving focus", async () => {
  const user = userEvent.setup();
  fetchMock.mockImplementation(() => respond({ ...data, incidents: [] }));
  render(<Overview />);
  await screen.findByText(/No active incidents/);
  const refreshButton = screen.getByRole("button", {
    name: "Refresh overview",
  });
  fetchMock.mockImplementation(() => respond());
  await user.click(refreshButton);
  expect(await screen.findByRole("status")).toHaveTextContent(
    "checkout incident #1 open.",
  );
  expect(refreshButton).toHaveFocus();
  const observer = vi.fn();
  const mutation = new MutationObserver(observer);
  mutation.observe(screen.getByRole("status"), {
    childList: true,
    subtree: true,
    characterData: true,
  });
  await user.click(refreshButton);
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
  expect(observer).not.toHaveBeenCalled();
  const recovered = structuredClone(data);
  recovered.incidents[0].state = "recovered";
  recovered.incidents[0].recovered_at = "2026-01-01T12:05:00Z";
  fetchMock.mockImplementation(() => respond(recovered));
  await user.click(refreshButton);
  await waitFor(() =>
    expect(screen.getByRole("status")).toHaveTextContent(
      "checkout incident #1 recovered.",
    ),
  );
  expect(refreshButton).toHaveFocus();
  mutation.disconnect();
});

it("confirms a demo-only reset, restores context and focus, and announces completion", async () => {
  const user = userEvent.setup();
  fetchMock.mockImplementation((url: string) =>
    respond(
      url === "/api/demo/reset"
        ? {
            ...data,
            run: "new-run",
            incidents: [],
            progress: { ...data.progress, steps: 0 },
          }
        : { ...data, run: "old-run" },
    ),
  );
  const { container } = render(<Overview />);
  const reset = await screen.findByRole("button", { name: "Reset demo" });
  await waitFor(() => expect(reset).toBeEnabled());
  const resetFocus = vi.spyOn(reset, "focus");
  reset.focus();
  await user.keyboard("{Enter}");
  expect(
    screen.getByRole("heading", { name: "Reset only Demo?" }),
  ).toBeVisible();
  expect(fetchMock.mock.calls.some(([url]) => url === "/api/demo/reset")).toBe(
    false,
  );
  expect(
    (
      await axe.run(container, {
        rules: { "color-contrast": { enabled: false } },
      })
    ).violations,
  ).toEqual([]);
  await user.click(screen.getByRole("button", { name: "Cancel reset" }));
  expect(reset).toHaveFocus();
  expect(resetFocus).toHaveBeenLastCalledWith({ preventScroll: true });
  await user.click(reset);
  await user.click(
    screen.getByRole("button", { name: "Confirm reset Demo only" }),
  );
  await screen.findByText(
    "Demo reset. Normal history restored; Live and Historical are unchanged.",
  );
  expect(fetchMock).toHaveBeenCalledWith("/api/demo/reset", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ run: "old-run", confirm_demo_only: true }),
  });
  expect(window.location.search).toBe(
    "?view=overview&dataset=demo&run=new-run",
  );
  await waitFor(() => expect(reset).toHaveFocus());
  expect(resetFocus).toHaveBeenLastCalledWith({ preventScroll: true });
  resetFocus.mockRestore();
  expect(
    screen.queryByRole("heading", { name: "Reset only Demo?" }),
  ).not.toBeInTheDocument();
});

it("keeps reset confirmation and investigation after an unknown result", async () => {
  const user = userEvent.setup();
  fetchMock.mockImplementation((url: string) =>
    url === "/api/demo/reset"
      ? Promise.resolve({ ok: false, status: 503 } as Response)
      : respond({ ...data, run: "old-run" }),
  );
  render(<Overview />);
  await user.click(
    await screen.findByRole("link", {
      name: "Investigate checkout incident #1",
    }),
  );
  const location = window.location.search;
  await user.click(screen.getByRole("button", { name: "Reset demo" }));
  await user.click(
    screen.getByRole("button", { name: "Confirm reset Demo only" }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Reset result unknown (HTTP 503)",
  );
  expect(window.location.search).toBe(location);
  expect(
    screen.getByRole("heading", { name: "checkout · open" }),
  ).toBeVisible();
  expect(
    screen.getByRole("button", { name: "Confirm reset Demo only" }),
  ).toBeEnabled();
});

it("prevents duplicate reset or advance while reset is pending", async () => {
  const user = userEvent.setup();
  let finish!: (response: Response) => void;
  fetchMock.mockImplementation((url: string) =>
    url === "/api/demo/reset"
      ? new Promise<Response>((resolve) => {
          finish = resolve;
        })
      : respond({ ...data, run: "old-run" }),
  );
  render(<Overview />);
  const reset = await screen.findByRole("button", { name: "Reset demo" });
  await waitFor(() => expect(reset).toBeEnabled());
  await user.click(reset);
  await user.click(
    screen.getByRole("button", { name: "Confirm reset Demo only" }),
  );
  expect(
    screen.getByRole("button", { name: "Resetting Demo…" }),
  ).toBeDisabled();
  expect(
    screen.getByRole("button", { name: "Advance one minute" }),
  ).toBeDisabled();
  expect(screen.getByRole("button", { name: "Cancel reset" })).toBeDisabled();
  await act(async () =>
    finish(await respond({ ...data, run: "new-run", incidents: [] })),
  );
  await screen.findByText(
    "Demo reset. Normal history restored; Live and Historical are unchanged.",
  );
  expect(
    fetchMock.mock.calls.filter(([url]) => url === "/api/demo/reset"),
  ).toHaveLength(1);
});

it("does not offer demo reset in Live", async () => {
  window.history.replaceState({}, "", "/?view=overview&dataset=live");
  render(<Overview />);
  await screen.findByRole("link", { name: "Investigate checkout incident #1" });
  expect(
    screen.queryByRole("button", { name: "Reset demo" }),
  ).not.toBeInTheDocument();
});

it("binds confirmation to its original run even if a refresh discovers another reset", async () => {
  const user = userEvent.setup();
  fetchMock.mockImplementation(() => respond({ ...data, run: "old-run" }));
  render(<Overview />);
  const reset = await screen.findByRole("button", { name: "Reset demo" });
  await waitFor(() => expect(reset).toBeEnabled());
  await user.click(reset);
  fetchMock.mockImplementation((url: string) =>
    url === "/api/demo/reset"
      ? Promise.resolve({ ok: false, status: 409 } as Response)
      : respond({ ...data, run: "new-run" }),
  );
  await user.click(screen.getByRole("button", { name: "Refresh overview" }));
  await user.click(
    screen.getByRole("button", { name: "Confirm reset Demo only" }),
  );
  expect(fetchMock).toHaveBeenCalledWith(
    "/api/demo/reset",
    expect.objectContaining({
      body: JSON.stringify({ run: "old-run", confirm_demo_only: true }),
    }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Cancel, refresh this page",
  );
});

it.each([null, "1"])(
  "blocks a stale run URL with incident %s until returning to current Demo",
  async (incident) => {
    const oldRun = "00000000-0000-4000-8000-000000000001";
    const currentRun = "00000000-0000-4000-8000-000000000002";
    window.history.replaceState(
      {},
      "",
      `?view=overview&dataset=demo&run=${oldRun}${incident ? `&incident=${incident}` : ""}`,
    );
    fetchMock.mockImplementation(() => respond({ ...data, run: currentRun }));
    const user = userEvent.setup();
    const { container } = render(<Overview />);
    expect(await screen.findByText(/This demo run was reset/)).toBeVisible();
    const advance = screen.getByRole("button", { name: "Advance one minute" });
    const reset = screen.getByRole("button", { name: "Reset demo" });
    expect(advance).toBeDisabled();
    expect(reset).toBeDisabled();
    await user.click(advance);
    await user.click(reset);
    expect(
      fetchMock.mock.calls.some(([, options]) => options?.method === "POST"),
    ).toBe(false);
    expect(
      (
        await axe.run(container, {
          rules: { "color-contrast": { enabled: false } },
        })
      ).violations,
    ).toEqual([]);
    await user.click(
      screen.getByRole("link", { name: "Return to current demo" }),
    );
    await waitFor(() => expect(advance).toBeEnabled());
    expect(reset).toBeEnabled();
    expect(
      screen.queryByText(/This demo run was reset/),
    ).not.toBeInTheDocument();
    await user.click(advance);
    expect(fetchMock).toHaveBeenLastCalledWith(
      `/api/demo/advance?run=${currentRun}`,
      { method: "POST" },
    );
  },
);

it("explains a stale Overview on Back after two successful resets", async () => {
  const runs = [
    "00000000-0000-4000-8000-000000000001",
    "00000000-0000-4000-8000-000000000002",
    "00000000-0000-4000-8000-000000000003",
  ];
  let index = 0;
  fetchMock.mockImplementation((url: string) => {
    if (url === "/api/demo/reset") index += 1;
    return respond({ ...data, run: runs[index], incidents: [] });
  });
  const user = userEvent.setup();
  render(<Overview />);
  const reset = await screen.findByRole("button", { name: "Reset demo" });
  await waitFor(() => expect(reset).toBeEnabled());
  for (const run of runs.slice(1)) {
    await user.click(reset);
    await user.click(
      screen.getByRole("button", { name: "Confirm reset Demo only" }),
    );
    await waitFor(() =>
      expect(window.location.search).toBe(
        `?view=overview&dataset=demo&run=${run}`,
      ),
    );
  }
  await act(async () => window.history.back());
  await waitFor(() => expect(window.location.search).toContain(runs[1]));
  expect(await screen.findByText(/This demo run was reset/)).toBeVisible();
  expect(
    screen.getByRole("button", { name: "Advance one minute" }),
  ).toBeDisabled();
  expect(reset).toBeDisabled();
  await user.click(screen.getByRole("button", { name: "Refresh overview" }));
  expect(await screen.findByText(/This demo run was reset/)).toBeVisible();
  await user.click(
    screen.getByRole("link", { name: "Return to current demo" }),
  );
  await waitFor(() => expect(reset).toBeEnabled());
  expect(
    screen.getByRole("button", { name: "Advance one minute" }),
  ).toBeEnabled();
  expect(
    fetchMock.mock.calls.filter(([url]) => url === "/api/demo/reset"),
  ).toHaveLength(2);
});

it("guides Demo Overview through existing controls without starting actions", async () => {
  render(<Overview />);
  await screen.findByRole("heading", { name: "Try the Demo" });
  expect(screen.getByRole("link", { name: "Reset Demo" })).toHaveAttribute(
    "href",
    "#reset-demo",
  );
  expect(
    screen.getByRole("link", {
      name: "Choose receiver behavior in Deliveries",
    }),
  ).toHaveAttribute("href", "?view=deliveries&dataset=demo");
  expect(
    screen.getByRole("link", { name: "advance one minute" }),
  ).toHaveAttribute("href", "#advance-demo");
  expect(
    screen.getByRole("button", { name: "Advance one minute" }),
  ).toHaveAttribute("id", "advance-demo");
  expect(
    screen.getByRole("link", { name: "Investigate the incident" }),
  ).toHaveAttribute("href", "#queue-heading");
  expect(
    fetchMock.mock.calls.every(
      ([, options]) => !options?.method || options.method === "GET",
    ),
  ).toBe(true);
});

it.each(["?view=overview&dataset=live", "?view=incidents&dataset=demo"])(
  "omits the walkthrough outside Demo Overview: %s",
  async (url) => {
    window.history.replaceState({}, "", url);
    render(<Overview />);
    await screen.findByRole("heading", {
      name: /Recent incidents|Incident queue/,
    });
    expect(
      screen.queryByRole("heading", { name: "Try the Demo" }),
    ).not.toBeInTheDocument();
  },
);
