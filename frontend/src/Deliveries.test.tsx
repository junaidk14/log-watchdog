import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { beforeEach, expect, it, vi } from "vitest";
import { Router } from "./Router";
import type { OverviewData } from "./Overview";

const row = {
  id: "delivery-1",
  incident_id: 1,
  service: "checkout",
  incident_state: "recovered",
  kind: "opened",
  created_at: "2026-09-20T01:00:00Z",
  state: "retry scheduled",
  attempts_used: 1,
  next_retry: "2026-09-20T01:00:02Z",
  behavior: "fail-first-then-succeed",
  destination: "http://127.0.0.1:8000/api/receiver",
  payload: { message: "<script>untrusted</script>" },
  attempts: [
    {
      number: 1,
      started_at: "2026-09-20T01:00:00Z",
      finished_at: "2026-09-20T01:00:00.050Z",
      status: 503,
      error: "HTTP 503",
      duration_ms: 50,
      duplicate: false,
    },
  ],
};
let rows = [row];
let fail = false;
let poll: (() => void) | undefined;
beforeEach(() => {
  rows = [structuredClone(row)];
  fail = false;
  poll = undefined;
  window.history.replaceState(
    { focus: "deliveries-heading" },
    "",
    "?view=deliveries&dataset=demo&incident=1&run=run-1&service=checkout&start=2026-01-01T12:00:00Z&end=2026-01-01T12:01:00Z&evaluation=91",
  );
  vi.spyOn(window, "setInterval").mockImplementation((handler, timeout) => {
    if (timeout === 1000) poll = handler as () => void;
    return 1;
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, options?: RequestInit) => {
      if (url === "/api/demo/receiver")
        return {
          ok: true,
          json: async () => ({
            behavior:
              options?.method === "PUT"
                ? JSON.parse(String(options.body)).behavior
                : "success",
          }),
        };
      return {
        ok: !fail,
        json: async () =>
          fail
            ? { detail: "Service temporarily unavailable" }
            : { deliveries: rows, max_attempts: 3, run: "run-1" },
      };
    }),
  );
});

it("expands payload and attempts with keyboard, retains focus through status updates, and preserves return context", async () => {
  const user = userEvent.setup();
  render(<Router />);
  expect(document.title).toBe("Deliveries · Log Watchdog");
  const button = await screen.findByRole("button", {
    name: /View payload and attempts/,
  });
  await waitFor(() =>
    expect(
      screen.getByRole("heading", { name: "Deliveries", level: 1 }),
    ).toHaveFocus(),
  );
  button.focus();
  await user.keyboard("{Enter}");
  expect(button).toHaveAttribute("aria-expanded", "true");
  expect(screen.getByText(/<script>untrusted/)).toBeVisible();
  expect(document.querySelector("script")).toBeNull();
  expect(screen.getByText(/HTTP status: 503/)).toBeVisible();
  rows = [{ ...row, state: "delivered", attempts_used: 2 }];
  await act(async () => poll?.());
  expect(button).toHaveFocus();
  expect(button).toHaveAttribute("aria-expanded", "true");
  expect(
    screen.getByText("checkout opened notification: delivered"),
  ).toBeInTheDocument();
  const back = screen.getByRole("link", { name: "Back to incident" });
  const href = back.getAttribute("href")!;
  expect(href).toContain("incident=1");
  expect(href).toContain("evaluation=91");
  expect(href).toContain("run=run-1");
  expect(href).toContain("view=incidents");
});

it("shows exhausted attempts independently from recovered incident and provides no resend", async () => {
  rows = [{ ...row, state: "exhausted", attempts_used: 3 }];
  const { container } = render(<Router />);
  expect(
    await screen.findByText(/3 of 3 attempts used; no further retries/),
  ).toBeVisible();
  expect(
    screen.getByText(/Incident recovered · Notification exhausted/),
  ).toBeVisible();
  expect(screen.queryByRole("button", { name: /resend/i })).toBeNull();
  expect(screen.getByRole("link", { name: "Demo Overview" })).toHaveAttribute(
    "href",
    "?view=overview&dataset=demo",
  );
  expect(
    screen.getByText(/To repeat the Demo opening scenario/),
  ).toHaveTextContent(
    /Reset demo, then Confirm reset Demo only.*restores the receiver to Success/,
  );
  expect(screen.getByText(/After resetting,/)).toHaveTextContent(
    /choose Demo receiver behavior, Save behavior, then return to Overview and Advance one minute/,
  );
  expect(
    (
      await axe.run(container, {
        rules: { "color-contrast": { enabled: false } },
      })
    ).violations,
  ).toEqual([]);
});

it("keeps prior results and offers retry after refresh failure", async () => {
  render(<Router />);
  await screen.findByRole("button", { name: /View payload/ });
  fail = true;
  await act(async () => poll?.());
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Updates unavailable",
  );
  expect(screen.getByText(/checkout · opened notification/)).toBeVisible();
  fail = false;
  fireEvent.click(screen.getByRole("button", { name: "Retry refresh" }));
  await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
});

it("saves explicitly selected receiver behavior for future notifications", async () => {
  const user = userEvent.setup();
  render(<Router />);
  const select = screen.getByRole("combobox", { name: "Receiver behavior" });
  await waitFor(() => expect(select).toBeEnabled());
  await user.selectOptions(select, "always-fail");
  await user.click(screen.getByRole("button", { name: "Save behavior" }));
  expect(
    await screen.findByText(
      "Receiver behavior saved for new Demo notifications.",
    ),
  ).toBeVisible();
  expect(fetch).toHaveBeenCalledWith(
    "/api/demo/receiver",
    expect.objectContaining({
      method: "PUT",
      body: '{"behavior":"always-fail"}',
    }),
  );
});

it("shows initial loading and historical empty state without demo controls", async () => {
  rows = [];
  window.history.replaceState({}, "", "?view=deliveries&dataset=historical");
  render(<Router />);
  expect(screen.getByText("Loading deliveries…")).toBeVisible();
  expect(
    await screen.findByText("Historical events do not trigger notifications."),
  ).toBeVisible();
  expect(
    screen.queryByRole("combobox", { name: "Receiver behavior" }),
  ).toBeNull();
});

it.each(["Overview", "Open overview"])(
  "opens Live Overview from Historical Deliveries via %s",
  async (linkName) => {
    const user = userEvent.setup();
    const overview: OverviewData = {
      dataset: "live",
      delayed: false,
      server_time: "2026-09-20T01:00:00Z",
      progress: {
        clock: "2026-09-20T01:00:00Z",
        steps: 0,
        next_start: "2026-09-20T01:00:00Z",
        last_success: null,
      },
      services: [],
      incidents: [],
      trends: [],
      config: {
        recovery_windows: 3,
        grace_seconds: 10,
        minimum_events: 20,
        minimum_baseline_windows: 10,
      },
    };
    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = String(input);
      const body = url.includes("/deliveries")
        ? { deliveries: [], max_attempts: 3, run: null }
        : url === "/api/datasets/live/overview"
          ? overview
          : { events: [], total: 0, page: 1, page_size: 50 };
      return { ok: true, json: async () => body } as Response;
    });
    window.history.replaceState({}, "", "?view=deliveries&dataset=historical");
    render(<Router />);
    await screen.findByText("Historical events do not trigger notifications.");
    await user.click(screen.getByRole("link", { name: linkName }));
    expect(
      await screen.findByRole("heading", { name: "Overview" }),
    ).toBeVisible();
    expect(screen.getByText("Live · Incoming logs")).toBeVisible();
    expect(screen.getByRole("combobox", { name: "Dataset" })).toHaveValue(
      "live",
    );
    expect(fetch).toHaveBeenCalledWith(
      "/api/datasets/live/overview",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  },
);

it("hides unavailable Incidents navigation in Historical Deliveries", async () => {
  rows = [];
  window.history.replaceState({}, "", "?view=deliveries&dataset=historical");
  render(<Router />);
  await screen.findByText("Historical events do not trigger notifications.");
  expect(screen.queryByRole("link", { name: "Incidents" })).toBeNull();
});

it("announces the first notification after empty history and only changed notifications afterward", async () => {
  rows = [];
  render(<Router />);
  await screen.findByText("No notifications");
  rows = [structuredClone(row)];
  await act(async () => poll?.());
  expect(
    screen.getByText("checkout opened notification: retry scheduled"),
  ).toBeInTheDocument();
  rows = [
    ...rows,
    { ...row, id: "delivery-2", kind: "recovered", state: "pending" },
  ];
  await act(async () => poll?.());
  expect(
    screen.getByText("checkout recovered notification: pending"),
  ).toBeInTheDocument();
  expect(
    screen.queryByText("checkout opened notification: retry scheduled"),
  ).toBeNull();
  const announcement = screen.getByText(
    "checkout recovered notification: pending",
  );
  const observer = vi.fn();
  const mutation = new MutationObserver(observer);
  mutation.observe(announcement, {
    childList: true,
    subtree: true,
    characterData: true,
  });
  await act(async () => poll?.());
  expect(observer).not.toHaveBeenCalled();
  mutation.disconnect();
});

it("reveals receiver setup on guide navigation but preserves saved history scroll", async () => {
  vi.mocked(window.setInterval).mockRestore();
  window.history.replaceState(
    { focus: "receiver-heading", revealFocus: true },
    "",
    "?view=deliveries&dataset=demo",
  );
  const reveal = vi.fn();
  HTMLElement.prototype.scrollIntoView = reveal;
  vi.stubGlobal("scrollTo", vi.fn());
  const { unmount } = render(<Router />);
  await screen.findByRole("heading", { name: "Demo receiver behavior" });
  await waitFor(() =>
    expect(
      screen.getByRole("heading", { name: "Demo receiver behavior" }),
    ).toHaveFocus(),
  );
  expect(reveal).toHaveBeenCalledWith({
    block: "start",
    behavior: "instant",
  });
  unmount();
  reveal.mockClear();
  window.history.replaceState(
    { focus: "receiver-heading", revealFocus: true, scrollY: 300 },
    "",
    "?view=deliveries&dataset=demo",
  );
  render(<Router />);
  await waitFor(() => expect(window.scrollTo).toHaveBeenCalledWith(0, 300));
  expect(reveal).not.toHaveBeenCalled();
  delete (HTMLElement.prototype as Partial<HTMLElement>).scrollIntoView;
});
