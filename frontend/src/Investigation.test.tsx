import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import axe from "axe-core";
import { Router } from "./Router";

const measurement = {
  id: 91,
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
const event = {
  sequence: 3601,
  event_id: "sample-1",
  timestamp: measurement.start,
  service: "checkout",
  severity: "ERROR",
  message: "Downstream timeout",
  metadata: { duration: 1500 },
  ingested_at: measurement.end,
  included: true,
};
const evidence = {
  dataset: "demo",
  run: "run-1",
  measurement,
  windows: [measurement],
  evaluated_total: 40,
  retained_total: 40,
  evidence_missing: false,
  total: 40,
  page: 1,
  page_size: 50,
  patterns: [{ message: event.message, count: 16 }],
  sample: [event],
  events: [event],
};
const overview = {
  dataset: "demo",
  run: "run-1",
  delayed: false,
  server_time: measurement.end,
  progress: {
    clock: measurement.end,
    steps: 1,
    next_start: measurement.end,
    last_success: measurement.end,
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
beforeEach(() => {
  window.history.replaceState({}, "", "/?view=overview&dataset=demo");
  vi.stubGlobal("scrollTo", vi.fn());
  vi.stubGlobal("scrollY", 0);
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (url: string) => {
    const params = new URL(url, "http://localhost").searchParams;
    if (url.includes("overview"))
      return { ok: true, json: async () => structuredClone(overview) };
    const all = params.get("scope") === "all";
    const filtered =
      params.has("severity") || params.has("message") || params.has("event_id");
    return {
      ok: true,
      json: async () => ({
        ...evidence,
        total: filtered ? 1 : all ? 41 : 40,
        events: all
          ? [
              event,
              { ...event, sequence: 3602, event_id: "late-1", included: false },
            ]
          : [event],
      }),
    };
  });
  vi.stubGlobal("fetch", fetchMock);
});

it("keeps evaluated scope, filters, measurements and return focus through keyboard investigation", async () => {
  const user = userEvent.setup();
  const { container } = render(<Router />);
  const investigate = await screen.findByRole("link", {
    name: "Investigate checkout incident #1",
  });
  investigate.focus();
  await user.keyboard("{Enter}");
  await waitFor(() =>
    expect(
      screen.getByRole("heading", { name: "checkout · open" }),
    ).toHaveFocus(),
  );
  expect(document.title).toBe("Incidents · Log Watchdog");
  const logs = await screen.findByRole("link", { name: "View evaluated logs" });
  expect(logs).toHaveAttribute(
    "href",
    expect.stringContaining("evaluation=91"),
  );
  vi.stubGlobal("scrollY", 420);
  logs.focus();
  await user.keyboard("{Enter}");
  await waitFor(() =>
    expect(screen.getByRole("heading", { name: "Logs" })).toHaveFocus(),
  );
  expect(
    await screen.findByText(
      /40 evaluated events · 40 matching current filters/,
    ),
  ).toBeInTheDocument();
  expect(screen.getByLabelText("Service")).toHaveAttribute("readonly");
  await user.selectOptions(screen.getByLabelText("Severity"), "ERROR");
  await user.click(screen.getByRole("button", { name: "Apply filters" }));
  expect(
    await screen.findByText(/40 evaluated events · 1 matching current filters/),
  ).toBeInTheDocument();
  await user.click(
    screen.getByRole("checkbox", { name: "Include later arrivals" }),
  );
  expect(
    await screen.findByText(/Arrived after evaluation/),
  ).toBeInTheDocument();
  expect(window.location.search).toContain("severity=ERROR");
  await user.click(
    screen.getByRole("checkbox", { name: "Include later arrivals" }),
  );
  await waitFor(() =>
    expect(
      screen.queryByText(/Arrived after evaluation/),
    ).not.toBeInTheDocument(),
  );
  await user.click(screen.getByRole("button", { name: "Clear filters" }));
  expect(window.location.search).toContain("incident=1");
  expect(window.location.search).toContain("evaluation=91");
  expect(window.location.search).not.toContain("severity=");
  const expand = await screen.findByRole("button", {
    name: "Expand event sample-1",
  });
  expand.focus();
  await user.keyboard("{Enter}");
  expect(expand).toHaveFocus();
  expect(expand).toHaveAttribute("aria-expanded", "true");
  expect(screen.getByText(/"duration": 1500/)).toBeVisible();
  await user.click(screen.getByRole("link", { name: "Back to incident" }));
  await waitFor(() =>
    expect(
      screen.getByRole("link", { name: "View evaluated logs" }),
    ).toHaveFocus(),
  );
  expect(window.scrollTo).toHaveBeenCalledWith(0, 420);
  expect(
    await screen.findByRole("heading", { name: "Local evidence summary" }),
  ).toBeInTheDocument();
  const report = await axe.run(container, {
    rules: { "color-contrast": { enabled: false } },
  });
  expect(report.violations).toEqual([]);
});

it("restores browser Back and follows pattern and sample evidence links", async () => {
  const user = userEvent.setup();
  render(<Router />);
  await user.click(
    await screen.findByRole("link", {
      name: "Investigate checkout incident #1",
    }),
  );
  await user.click(
    await screen.findByRole("link", { name: "Downstream timeout" }),
  );
  await screen.findByRole("heading", { name: "Logs" });
  expect(window.location.search).toContain("message=Downstream+timeout");
  await act(async () => window.history.back());
  await waitFor(() =>
    expect(
      screen.getByRole("link", { name: "Downstream timeout" }),
    ).toHaveFocus(),
  );
  await user.click(
    screen.getByRole("link", { name: "Inspect event sample-1" }),
  );
  await screen.findByRole("heading", { name: "Logs" });
  expect(window.location.search).toContain("event_id=sample-1");
  await user.click(
    screen.getByRole("button", { name: "Leave incident scope" }),
  );
  expect(window.location.search).not.toContain("incident=");
  expect(window.location.search).not.toContain("event_id=");
  await waitFor(() =>
    expect(fetchMock).toHaveBeenLastCalledWith(
      expect.stringContaining("/events?"),
      expect.anything(),
    ),
  );
});

it("distinguishes missing retained evidence, empty filters and stale demo links", async () => {
  const user = userEvent.setup();
  window.history.replaceState(
    {},
    "",
    "/?view=logs&dataset=demo&incident=1&evaluation=91&run=run-1",
  );
  fetchMock.mockResolvedValue({
    ok: true,
    json: async () => ({
      ...evidence,
      total: 0,
      retained_total: 0,
      evidence_missing: true,
      events: [],
    }),
  });
  render(<Router />);
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Evidence no longer available under the retention policy",
  );
  expect(
    screen.queryByRole("heading", { name: "No matching logs" }),
  ).not.toBeInTheDocument();
  fetchMock.mockResolvedValue({
    ok: false,
    status: 410,
    json: async () => ({
      detail: "This demo run was reset. Return to the current demo.",
    }),
  });
  await user.click(screen.getByRole("button", { name: "Refresh" }));
  await waitFor(() =>
    expect(screen.getByText(/This demo run was reset/)).toBeInTheDocument(),
  );
  expect(
    screen.getByRole("link", { name: "Return to current demo" }),
  ).toHaveAttribute("href", "?view=overview&dataset=demo");
});

it("keeps keyboard focus and interval through multiple-window selection and every Logs entry", async () => {
  const user = userEvent.setup();
  const older = {
    ...measurement,
    id: 90,
    start: "2026-01-01T11:59:00Z",
    end: measurement.start,
  };
  fetchMock.mockImplementation(async (url: string) => {
    if (url.includes("overview"))
      return { ok: true, json: async () => structuredClone(overview) };
    const params = new URL(url, "http://localhost").searchParams;
    return {
      ok: true,
      json: async () => ({
        ...evidence,
        windows: [older, measurement],
        measurement: params.get("evaluation") === "90" ? older : measurement,
      }),
    };
  });
  render(<Router />);
  await user.click(
    await screen.findByRole("link", {
      name: "Investigate checkout incident #1",
    }),
  );
  const selector = await screen.findByLabelText("Evaluated window");
  selector.focus();
  await user.selectOptions(selector, "90");
  await waitFor(() =>
    expect(screen.getByLabelText("Evaluated window")).toHaveFocus(),
  );
  expect(screen.getByLabelText("Evaluated window")).toBe(selector);
  expect(new URLSearchParams(window.location.search).get("start")).toBe(
    older.start,
  );
  await waitFor(() =>
    expect(
      screen.getByRole("link", { name: "View evaluated logs" }),
    ).toHaveAttribute("href", expect.stringContaining("evaluation=90")),
  );
  await user.click(screen.getByRole("link", { name: "Logs" }));
  await screen.findByRole("heading", { name: "Logs" });
  expect(screen.getByLabelText("From (UTC)")).toHaveValue(older.start);
  expect(screen.getByLabelText("To (UTC)")).toHaveValue(older.end);
  await user.click(
    screen.getByRole("button", { name: "Leave incident scope" }),
  );
  await waitFor(() =>
    expect(fetchMock).toHaveBeenLastCalledWith(
      expect.stringContaining("/events?"),
      expect.anything(),
    ),
  );
  const last = new URL(fetchMock.mock.calls.at(-1)![0], "http://localhost");
  expect(last.searchParams.get("start")).toBe(older.start);
  expect(last.searchParams.get("end")).toBe(older.end);
});

it.each([undefined, "removed-control", "incident-1"])(
  "returns from primary Logs with saved focus %s to visible incident detail",
  async (savedFocus) => {
    const user = userEvent.setup();
    const { container } = render(<Router />);
    // Model the narrow layout's hidden queue without claiming rendered coverage.
    const style = document.createElement("style");
    style.textContent = ".has-selection .incident-queue { display: none; }";
    container.append(style);
    await user.click(
      await screen.findByRole("link", {
        name: "Investigate checkout incident #1",
      }),
    );
    await screen.findByRole("link", { name: "View evaluated logs" });
    await user.click(screen.getByRole("link", { name: "Logs" }));
    await screen.findByRole("heading", { name: "Logs" });
    if (savedFocus !== undefined) {
      window.history.replaceState(
        { ...window.history.state, returnState: { focus: savedFocus } },
        "",
      );
    }
    await user.click(screen.getByRole("link", { name: "Back to incident" }));
    await waitFor(() => {
      const heading = screen.getByRole("heading", { name: "checkout · open" });
      expect(heading).toBeVisible();
      expect(heading).toHaveFocus();
    });
    expect(window.location.search).toContain("incident=1");
    expect(window.location.search).toContain("evaluation=91");
  },
);

it.each([false, true])(
  "restores primary Logs browser Back after delayed evidence (missing identity=%s)",
  async (missingIdentity) => {
    const user = userEvent.setup();
    render(<Router />);
    await user.click(
      await screen.findByRole("link", {
        name: "Investigate checkout incident #1",
      }),
    );
    await screen.findByRole("link", { name: "View evaluated logs" });
    const logs = screen.getByRole("link", { name: "Logs" });
    logs.focus();
    if (missingIdentity) {
      // Model an older entry with no saved identity, without another focusin.
      window.history.replaceState(
        { ...window.history.state, focus: undefined },
        "",
      );
      fireEvent.click(logs);
    } else {
      await user.keyboard("{Enter}");
    }
    await screen.findByRole("heading", { name: "Logs" });
    let finish!: (response: unknown) => void;
    const delayed = new Promise((resolve) => {
      finish = resolve;
    });
    fetchMock.mockImplementation(async (url: string) =>
      url.includes("overview")
        ? { ok: true, json: async () => structuredClone(overview) }
        : delayed,
    );
    await act(async () => window.history.back());
    await screen.findByText("Loading evaluated evidence…");
    expect(
      screen.getByRole("heading", { name: "checkout · open" }),
    ).not.toHaveFocus();
    await act(async () => finish({ ok: true, json: async () => evidence }));
    await waitFor(() => {
      const heading = screen.getByRole("heading", { name: "checkout · open" });
      expect(heading).toBeVisible();
      expect(heading).toHaveFocus();
    });
    expect(window.location.search).toContain("incident=1");
    expect(window.location.search).toContain("evaluation=91");
    expect(screen.getByLabelText("Evaluated window")).toHaveValue("91");
    await user.click(screen.getByRole("button", { name: "Refresh incidents" }));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Refresh incidents" }),
      ).toBeEnabled(),
    );
    expect(
      screen.getByRole("button", { name: "Refresh incidents" }),
    ).toHaveFocus();
  },
);

it("restores the incident and evaluation into visible detail after clearing selection and browser Back", async () => {
  const user = userEvent.setup();
  const { container } = render(<Router />);
  const style = document.createElement("style");
  style.textContent =
    ".has-selection .incident-queue { display: none; } .incident-workbench:not(.has-selection) .incident-pane { display: none; }";
  container.append(style);
  await user.click(
    await screen.findByRole("link", {
      name: "Investigate checkout incident #1",
    }),
  );
  await screen.findByRole("link", { name: "View evaluated logs" });
  await user.click(screen.getByRole("button", { name: "Back to incidents" }));
  await waitFor(() =>
    expect(
      screen.getByRole("link", { name: "Investigate checkout incident #1" }),
    ).toHaveFocus(),
  );
  expect(window.location.search).not.toContain("incident=");
  await act(async () => window.history.back());
  await waitFor(() => {
    const heading = screen.getByRole("heading", { name: "checkout · open" });
    expect(heading).toBeVisible();
    expect(heading).toHaveFocus();
  });
  expect(window.location.search).toContain("incident=1");
  expect(window.location.search).toContain("evaluation=91");
  expect(await screen.findByLabelText("Evaluated window")).toHaveValue("91");
});

it.each([
  ["explicit Back", false],
  ["explicit Back", true],
  ["browser Back", false],
  ["browser Back", true],
] as const)(
  "restores focus after a failed returning Overview via %s (delayed=%s)",
  async (navigation, delayedFailure) => {
    const user = userEvent.setup();
    render(<Router />);
    await user.click(
      await screen.findByRole("link", {
        name: "Investigate checkout incident #1",
      }),
    );
    await user.click(
      await screen.findByRole("link", { name: "View evaluated logs" }),
    );
    await screen.findByText(
      /40 evaluated events · 40 matching current filters/,
    );
    let finish!: (response: unknown) => void;
    const delayed = new Promise((resolve) => {
      finish = resolve;
    });
    fetchMock.mockImplementationOnce(async () =>
      delayedFailure ? delayed : { ok: false, status: 503 },
    );
    if (navigation === "browser Back") {
      await act(async () => window.history.back());
    } else {
      await user.click(screen.getByRole("link", { name: "Back to incident" }));
    }
    if (delayedFailure) {
      await screen.findByText("Loading incidents…");
      expect(
        screen.getByRole("heading", { name: "Incidents", level: 1 }),
      ).not.toHaveFocus();
      await act(async () => finish({ ok: false, status: 503 }));
    }
    expect(await screen.findByRole("alert")).toHaveTextContent("HTTP 503");
    const heading = screen.getByRole("heading", {
      name: "Incidents",
      level: 1,
    });
    await waitFor(() => {
      expect(heading).toBeVisible();
      expect(heading).toHaveFocus();
    });
    expect(window.location.search).toContain("incident=1");
    expect(window.location.search).toContain("evaluation=91");
    const retry = screen.getByRole("button", { name: "Retry refresh" });
    expect(retry).toBeEnabled();
    retry.focus();
    await user.keyboard("{Enter}");
    expect(await screen.findByLabelText("Evaluated window")).toHaveValue("91");
    await screen.findByRole("link", { name: "View evaluated logs" });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(window.location.search).toContain("incident=1");
    expect(window.location.search).toContain("evaluation=91");
    // Subsequent updates must not replay the completed return restoration.
    const refresh = screen.getByRole("button", { name: "Refresh incidents" });
    fetchMock.mockClear();
    await user.click(refresh);
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/overview"),
        expect.anything(),
      ),
    );
    expect(refresh).toHaveFocus();
  },
);

it.each([true, false])(
  "waits for returning evidence before restoring a control or falling back (success=%s)",
  async (ok) => {
    const user = userEvent.setup();
    render(<Router />);
    await user.click(
      await screen.findByRole("link", {
        name: "Investigate checkout incident #1",
      }),
    );
    await user.click(
      await screen.findByRole("link", { name: "View evaluated logs" }),
    );
    await screen.findByRole("heading", { name: "Logs" });
    let finish!: (response: unknown) => void;
    const delayed = new Promise((resolve) => {
      finish = resolve;
    });
    fetchMock.mockImplementation(async (url: string) =>
      url.includes("overview")
        ? { ok: true, json: async () => structuredClone(overview) }
        : delayed,
    );
    await user.click(screen.getByRole("link", { name: "Back to incident" }));
    await screen.findByText("Loading evaluated evidence…");
    expect(
      screen.getByRole("heading", { name: "checkout · open" }),
    ).not.toHaveFocus();
    await act(async () =>
      finish({
        ok,
        json: async () => (ok ? evidence : { detail: "Evidence unavailable" }),
      }),
    );
    await waitFor(() =>
      expect(
        ok
          ? screen.getByRole("link", { name: "View evaluated logs" })
          : screen.getByRole("heading", { name: "checkout · open" }),
      ).toHaveFocus(),
    );
    // Completion must not steal focus again when the user chooses another control.
    const back = screen.getByRole("button", { name: "Back to incidents" });
    back.focus();
    await user.click(screen.getByRole("button", { name: "Refresh incidents" }));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Refresh incidents" }),
      ).toHaveFocus(),
    );
  },
);

it.each([
  "evidence",
  "heading",
  "Back to incidents",
  "Refresh incidents",
  "missing",
  "empty",
  "unidentified",
])(
  "restores current %s focus and scroll after reload with delayed evidence",
  async (target) => {
    const user = userEvent.setup();
    const page = render(<Router />);
    await user.click(
      await screen.findByRole("link", {
        name: "Investigate checkout incident #1",
      }),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "checkout · open" }),
      ).toHaveFocus(),
    );
    const logs = await screen.findByRole("link", {
      name: "View evaluated logs",
    });
    const restoredControl = () => {
      if (target === "evidence")
        return screen.getByRole("link", { name: "View evaluated logs" });
      if (target === "Back to incidents" || target === "Refresh incidents")
        return screen.getByRole("button", { name: target });
      return screen.getByRole("heading", { name: "checkout · open" });
    };
    expect(logs).toBeInTheDocument();
    if (target === "unidentified") {
      screen.getByRole("button", { name: "Advance one minute" }).focus();
      expect(window.history.state.focus).toBe("incident-heading");
    } else restoredControl().focus();
    vi.stubGlobal("scrollY", 900);
    window.dispatchEvent(new Event("scroll"));
    if (target === "missing" || target === "empty") {
      window.history.replaceState(
        {
          ...window.history.state,
          focus: target === "missing" ? "removed-control" : "",
        },
        "",
      );
    }
    const url = window.location.href;
    page.unmount();

    let finish!: (response: unknown) => void;
    const delayed = new Promise((resolve) => {
      finish = resolve;
    });
    fetchMock.mockImplementation(async (url: string) =>
      url.includes("overview")
        ? { ok: true, json: async () => structuredClone(overview) }
        : delayed,
    );
    vi.stubGlobal("scrollY", 0);
    vi.mocked(window.scrollTo).mockClear();
    render(<Router />);
    await screen.findByText("Loading evaluated evidence…");
    // Loading can move the viewport and focus; neither may replace the snapshot.
    window.dispatchEvent(new Event("scroll"));
    document.getElementById("overview-heading")!.focus();
    expect(window.scrollTo).not.toHaveBeenCalled();
    await act(async () => finish({ ok: true, json: async () => evidence }));
    await waitFor(() => {
      expect(restoredControl()).toBeVisible();
      expect(restoredControl()).toHaveFocus();
    });
    expect(window.scrollTo).toHaveBeenLastCalledWith(0, 900);
    expect(window.location.href).toBe(url);
    expect(screen.getByLabelText("Evaluated window")).toHaveValue("91");
    expect(window.location.search).toContain("incident=1");
  },
);

it.each(["explicit", "browser"])(
  "restores the delivery origin after %s Back",
  async (mode) => {
    const original = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes("/deliveries"))
        return {
          ok: true,
          json: async () => ({ deliveries: [], max_attempts: 3, run: "run-1" }),
        };
      if (url.includes("/receiver"))
        return { ok: true, json: async () => ({ behavior: "success" }) };
      return original(url);
    });
    const user = userEvent.setup();
    render(<Router />);
    await user.click(
      await screen.findByRole("link", {
        name: "Investigate checkout incident #1",
      }),
    );
    const origin = await screen.findByRole("link", {
      name: "View delivery history",
    });
    origin.focus();
    await user.keyboard("{Enter}");
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Deliveries" })).toHaveFocus(),
    );
    expect(window.location.search).toContain("evaluation=91");
    expect(window.location.search).toContain("run=run-1");
    if (mode === "explicit")
      await user.click(screen.getByRole("link", { name: "Back to incident" }));
    else
      await act(async () => {
        window.history.back();
        await new Promise((resolve) => setTimeout(resolve, 30));
      });
    await waitFor(() =>
      expect(
        screen.getByRole("link", { name: "View delivery history" }),
      ).toHaveFocus(),
    );
    expect(window.location.search).toContain("incident=1");
  },
);

it("keeps the local summary and pinned investigation usable when optional Gemini is unavailable", async () => {
  const base = fetchMock.getMockImplementation()!;
  fetchMock.mockImplementation((url: string, options?: RequestInit) => {
    if (url.includes("/analysis/preview"))
      return Promise.resolve({
        ok: false,
        json: async () => ({
          detail:
            "Gemini is not configured. The local summary remains available.",
        }),
      });
    return base(url, options);
  });
  const user = userEvent.setup();
  render(<Router />);
  await user.click(
    await screen.findByRole("link", {
      name: "Investigate checkout incident #1",
    }),
  );
  await user.click(
    await screen.findByRole("button", {
      name: "Preview evidence for analysis",
    }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Gemini is not configured",
  );
  expect(
    screen.getByRole("heading", { name: "Local evidence summary" }),
  ).toBeInTheDocument();
  expect(window.location.search).toContain("incident=1");
  await user.click(screen.getByRole("link", { name: "View evaluated logs" }));
  expect(
    await screen.findByText(
      /40 evaluated events · 40 matching current filters/,
    ),
  ).toBeInTheDocument();
});

it("preserves the preview, local summary and evidence navigation after invalid Gemini analysis", async () => {
  const base = fetchMock.getMockImplementation()!;
  const packet = '{"sample":[{"message":"Downstream timeout"}]}';
  fetchMock.mockImplementation((url: string, options?: RequestInit) => {
    if (url.includes("/analysis/preview"))
      return Promise.resolve({
        ok: true,
        json: async () => ({
          preview_id: "preview-token",
          packet,
          provider: "Gemini",
          model: "test-model",
          synthetic_only: true,
          paid_service: false,
        }),
      });
    if (url === "/api/analysis/send")
      return Promise.resolve({
        ok: false,
        json: async () => ({
          detail:
            "Gemini returned invalid or incomplete analysis. Retry or use the local summary.",
        }),
      });
    return base(url, options);
  });
  const user = userEvent.setup();
  render(<Router />);
  await user.click(
    await screen.findByRole("link", {
      name: "Investigate checkout incident #1",
    }),
  );
  await user.click(
    await screen.findByRole("button", {
      name: "Preview evidence for analysis",
    }),
  );
  await user.click(
    await screen.findByRole("button", { name: "Send for analysis" }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Gemini returned invalid or incomplete analysis",
  );
  expect(screen.getByText(packet)).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Send for analysis" }),
  ).toBeEnabled();
  expect(
    screen.getByRole("heading", { name: "Local evidence summary" }),
  ).toBeInTheDocument();
  expect(window.location.search).toContain("incident=1");
  expect(
    fetchMock.mock.calls.filter(([url]) => url === "/api/analysis/send"),
  ).toHaveLength(1);
  await user.click(screen.getByRole("link", { name: "View evaluated logs" }));
  expect(
    await screen.findByText(
      /40 evaluated events · 40 matching current filters/,
    ),
  ).toBeInTheDocument();
});

it("distinguishes Incidents from Overview, scopes measurements, and restores destination titles", async () => {
  const user = userEvent.setup();
  const recovered = structuredClone(overview);
  recovered.incidents[0].state = "recovered";
  recovered.incidents[0].end = "2026-01-01T12:05:00Z";
  recovered.services[0] = {
    ...measurement,
    rate: 0,
    errors: 0,
    status: "no spike detected",
    start: "2026-01-01T12:04:00Z",
    end: "2026-01-01T12:05:00Z",
  };
  fetchMock.mockImplementation(async (url: string) => ({
    ok: true,
    json: async () => (url.includes("overview") ? recovered : evidence),
  }));
  render(<Router />);
  await screen.findByText("Service trends");
  expect(document.title).toBe("Overview · Log Watchdog");
  expect(
    screen.getByText(/Latest evaluated window: no spike detected/),
  ).toBeInTheDocument();
  expect(
    screen.getByText(/Latest abnormal window: 40.00% observed/),
  ).toBeInTheDocument();
  expect(screen.getByText(/Measurement \(UTC\):/)).toHaveTextContent(
    "12:01:00Z",
  );
  expect(screen.getByText(/Incident interval \(UTC\):/)).toHaveTextContent(
    "12:05:00Z",
  );
  await user.click(screen.getByRole("link", { name: "Incidents" }));
  await screen.findByRole("heading", { name: "Incident queue" });
  expect(document.title).toBe("Incidents · Log Watchdog");
  expect(screen.queryByText("Service trends")).not.toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Refresh incidents" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: "Skip to incidents" }),
  ).toBeInTheDocument();
  await user.click(screen.getByRole("link", { name: "Logs" }));
  await screen.findByRole("heading", { name: "Logs" });
  expect(document.title).toBe("Logs · Log Watchdog");
  await act(async () => window.history.back());
  await waitFor(() => expect(document.title).toBe("Incidents · Log Watchdog"));
});
