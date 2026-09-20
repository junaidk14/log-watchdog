import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import axe from "axe-core";
import { App } from "./App";

const row = {
  sequence: 1,
  event_id: "evt-1",
  timestamp: "2026-01-01T11:59:00.000000Z",
  service: "checkout",
  severity: "INFO",
  message: "Operation completed",
  metadata: { synthetic: true },
  ingested_at: "2026-01-01T12:00:00Z",
};
const result = {
  dataset: "demo",
  total: 101,
  page: 1,
  page_size: 50,
  events: [row],
};
function respond(body = result) {
  return Promise.resolve({ ok: true, json: async () => body } as Response);
}
const fetchMock = vi.fn();
beforeEach(() => {
  window.history.replaceState({}, "", "/");
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("scrollTo", vi.fn());
  vi.stubGlobal("scrollY", 0);
  fetchMock.mockReset();
  fetchMock.mockImplementation((url: string) =>
    url.startsWith("/api/historical/trends")
      ? Promise.resolve({
          ok: true,
          json: async () => ({ total: 0, buckets: [] }),
        })
      : respond(),
  );
});

describe("log explorer", () => {
  it("shows loading, count, metadata, and accessible expansion without losing focus", async () => {
    let resolve!: (value: Response) => void;
    fetchMock.mockReturnValueOnce(
      new Promise<Response>((r) => {
        resolve = r;
      }),
    );
    render(<App />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading logs");
    await act(async () => resolve(await respond()));
    expect(
      await screen.findByText("101 matching events · Page 1 of 3"),
    ).toBeInTheDocument();
    const user = userEvent.setup();
    const expand = screen.getByRole("button", { name: "Expand event evt-1" });
    expand.focus();
    await user.keyboard("{Enter}");
    expect(expand).toHaveFocus();
    expect(expand).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(/"synthetic": true/)).toBeVisible();
    await user.keyboard("{Enter}");
    expect(expand).toHaveAttribute("aria-expanded", "false");
  });

  it("persists all filters in the URL, pages, and restores context on Back", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText(row.message);
    await user.type(screen.getByLabelText("Service"), "checkout");
    await user.selectOptions(screen.getByLabelText("Severity"), "ERROR");
    await user.type(
      screen.getByLabelText("From (UTC)"),
      "2026-01-01T11:30:00Z",
    );
    await user.type(screen.getByLabelText("To (UTC)"), "2026-01-01T12:00:00Z");
    await user.type(screen.getByLabelText("Message contains"), "timeout");
    await user.click(screen.getByRole("button", { name: "Apply filters" }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenLastCalledWith(
        expect.stringContaining("severity=ERROR"),
        expect.anything(),
      ),
    );
    const filteredUrl = window.location.href;
    expect(new URL(filteredUrl).searchParams.get("message")).toBe("timeout");
    await user.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenLastCalledWith(
        expect.stringContaining("page=2"),
        expect.anything(),
      ),
    );
    expect(screen.getByRole("heading", { name: "Logs" })).toHaveFocus();
    act(() => {
      window.history.replaceState({}, "", filteredUrl);
      window.dispatchEvent(
        new PopStateEvent("popstate", { state: { scrollY: 420 } }),
      );
    });
    await waitFor(() => expect(window.scrollTo).toHaveBeenCalledWith(0, 420));
    expect(screen.getByLabelText("Service")).toHaveValue("checkout");
    expect(screen.getByLabelText("Message contains")).toHaveValue("timeout");
    await waitFor(() =>
      expect(fetchMock).toHaveBeenLastCalledWith(
        expect.stringContaining("page=1"),
        expect.anything(),
      ),
    );
  });

  it("keeps unchanged Apply and Clear usable without duplicate history entries", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText(row.message);
    const historyLength = window.history.length;
    await user.click(screen.getByRole("button", { name: "Apply filters" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(screen.getByText(row.message)).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(screen.getByText(row.message)).toBeVisible();
    expect(window.history.length).toBe(historyLength);
  });

  it("waits for Back results before restoring scroll, including an identical URL", async () => {
    render(<App />);
    await screen.findByText(row.message);
    let resolve!: (value: Response) => void;
    fetchMock.mockReturnValueOnce(
      new Promise<Response>((r) => {
        resolve = r;
      }),
    );
    act(() =>
      window.dispatchEvent(
        new PopStateEvent("popstate", { state: { scrollY: 800 } }),
      ),
    );
    expect(screen.getByRole("status")).toHaveTextContent("Loading logs");
    expect(window.scrollTo).not.toHaveBeenCalled();
    await act(async () => resolve(await respond()));
    expect(screen.getByText(row.message)).toBeVisible();
    expect(window.scrollTo).toHaveBeenCalledWith(0, 800);
  });

  it("switches datasets, preserves compatible filters, and clears within the active dataset", async () => {
    window.history.replaceState({}, "", "/?dataset=live&service=checkout");
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText(row.message);
    await user.selectOptions(screen.getByLabelText("Dataset"), "historical");
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/historical/events?service=checkout"),
        expect.anything(),
      ),
    );
    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(window.location.search).toBe("?view=logs&dataset=historical&page=1");
  });

  it("explains empty results and recovers from a failed initial request", async () => {
    fetchMock.mockRejectedValueOnce(
      new Error("Connection failed. Check the local server and retry."),
    );
    const user = userEvent.setup();
    render(<App />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Connection failed",
    );
    fetchMock.mockImplementation(() =>
      respond({ ...result, total: 0, events: [] }),
    );
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(
      await screen.findByRole("heading", { name: "No matching logs" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Clear filters and view all" }),
    ).toBeEnabled();
  });

  it("retains the last same-query result after a refresh failure", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText(row.message);
    fetchMock.mockRejectedValueOnce(new Error("Server unavailable"));
    await user.click(screen.getByRole("button", { name: "Refresh" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Showing results fetched at",
    );
    expect(screen.getByText(row.message)).toBeVisible();
  });

  it.each([
    "?dataset=unknown",
    "?severity=bad",
    "?page=0",
    "?start=yesterday",
    "?start=2026-01-02T00:00:00Z&end=2026-01-01T00:00:00Z",
  ])("rejects malformed URL filters: %s", async (url) => {
    window.history.replaceState({}, "", url);
    render(<App />);
    expect(await screen.findByRole("alert")).toBeVisible();
    expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    await screen.findByText(row.message);
  });

  it("does not let an old response leak into a newly selected dataset", async () => {
    let resolve!: (value: Response) => void;
    fetchMock.mockReturnValueOnce(
      new Promise<Response>((r) => {
        resolve = r;
      }),
    );
    render(<App />);
    fetchMock.mockImplementation(() =>
      respond({ ...result, dataset: "live", total: 0, events: [] }),
    );
    fireEvent.change(screen.getByLabelText("Dataset"), {
      target: { value: "live" },
    });
    await screen.findByRole("heading", { name: "No matching logs" });
    await act(async () => resolve(await respond()));
    expect(screen.queryByText(row.message)).not.toBeInTheDocument();
  });

  it("renders untrusted messages as text and passes available DOM accessibility checks", async () => {
    fetchMock.mockImplementation(() =>
      respond({
        ...result,
        events: [{ ...row, message: "<script>alert(1)</script>" }],
      }),
    );
    const { container } = render(<App />);
    await screen.findByText("<script>alert(1)</script>");
    expect(container.querySelector("script")).toBeNull();
    const report = await axe.run(container, {
      rules: { "color-contrast": { enabled: false } },
    });
    expect(report.violations).toEqual([]);
  });
});

it("restores the latest scroll on repeated Back/Forward after delayed results", async () => {
  const user = userEvent.setup();
  const scroll = (y: number) => {
    vi.stubGlobal("scrollY", y);
    fireEvent.scroll(window);
  };
  render(<App />);
  await screen.findByText(row.message);
  scroll(420);
  await user.selectOptions(screen.getByLabelText("Dataset"), "live");
  await screen.findByText(row.message);
  scroll(600);

  async function traverse(
    direction: "back" | "forward",
    dataset: string,
    y: number,
  ) {
    let resolve!: (value: Response) => void;
    fetchMock.mockReturnValueOnce(
      new Promise<Response>((r) => {
        resolve = r;
      }),
    );
    vi.mocked(window.scrollTo).mockClear();
    await act(async () => {
      const traversed = new Promise<void>((done) => {
        window.addEventListener("popstate", () => done(), { once: true });
      });
      window.history[direction]();
      await traversed;
    });
    expect(screen.getByLabelText("Dataset")).toHaveValue(dataset);
    expect(screen.getByRole("status")).toHaveTextContent("Loading logs");
    scroll(0); // Layout shrinking during loading must not erase saved positions.
    expect(window.scrollTo).not.toHaveBeenCalled();
    await act(async () => resolve(await respond()));
    expect(window.scrollTo).toHaveBeenLastCalledWith(0, y);
    scroll(y); // The browser emits a scroll event after restoration too.
  }

  await traverse("back", "demo", 420);
  scroll(800);
  await traverse("forward", "live", 600);
  scroll(950);
  await traverse("back", "demo", 800);
  await traverse("forward", "live", 950);
});

it("withholds stale general Demo Logs on load, refresh and Back, and restores current browsing", async () => {
  const savedUrl = "/?view=logs&dataset=demo&run=saved-run";
  window.history.replaceState({}, "", savedUrl);
  let reset = false;
  fetchMock.mockImplementation((url: string) => {
    if (
      reset &&
      new URL(url, window.location.origin).searchParams.get("run") ===
        "saved-run"
    ) {
      return Promise.resolve({
        ok: false,
        status: 410,
        json: async () => ({
          detail: "This demo run was reset. Return to the current demo.",
        }),
      });
    }
    return respond({
      ...result,
      events: [
        { ...row, message: reset ? "Replacement run event" : row.message },
      ],
    });
  });
  const user = userEvent.setup();
  const mounted = render(<App />);
  await screen.findByText(row.message);
  reset = true; // another tab resets the Demo
  await user.click(screen.getByRole("button", { name: "Refresh" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "This demo run was reset",
  );
  expect(screen.queryByText(row.message)).not.toBeInTheDocument();
  expect(screen.queryByText("Replacement run event")).not.toBeInTheDocument();
  expect(
    screen.queryByText(/Showing results fetched at/),
  ).not.toBeInTheDocument();
  expect((await axe.run(document.body)).violations).toEqual([]);
  mounted.unmount();
  render(<App />); // reload the saved URL
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "This demo run was reset",
  );
  await user.click(
    screen.getByRole("link", { name: "Return to current demo" }),
  );
  expect(new URLSearchParams(window.location.search).get("view")).toBe("logs");
  expect(new URLSearchParams(window.location.search).has("run")).toBe(false);
  await screen.findByText("Replacement run event");
  act(() => window.history.back());
  await waitFor(() => expect(window.location.search).toBe(savedUrl.slice(1)));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "This demo run was reset",
  );
  expect(screen.queryByText("Replacement run event")).not.toBeInTheDocument();
  await user.click(
    screen.getByRole("link", { name: "Return to current demo" }),
  );
  await screen.findByText("Replacement run event");
});

it("exposes the file chooser immediately through Historical and the Import JSON entry", async () => {
  const user = userEvent.setup();
  render(<App />);
  await screen.findByText("101 matching events · Page 1 of 3");
  await user.selectOptions(screen.getByLabelText("Dataset"), "historical");
  expect(await screen.findByLabelText("JSON log file")).toHaveAttribute(
    "type",
    "file",
  );
  expect(
    screen.getByRole("button", { name: "Import into Historical" }),
  ).toBeVisible();
  await user.selectOptions(screen.getByLabelText("Dataset"), "demo");
  await user.click(
    screen.getByRole("link", { name: "Import JSON into Historical" }),
  );
  expect(await screen.findByLabelText("JSON log file")).toBeVisible();
  expect(window.location.search).toContain("dataset=historical");
});

it("offers dataset service choices while retaining exact free-text filtering", async () => {
  fetchMock.mockImplementation(() =>
    Promise.resolve({
      ok: true,
      json: async () => ({ ...result, services: ["checkout", "worker"] }),
    }),
  );
  const user = userEvent.setup();
  render(<App />);
  await screen.findByText(row.message);
  const service = screen.getByRole("textbox", { name: "Service" });
  await user.selectOptions(
    screen.getByRole("combobox", { name: "Choose service" }),
    "worker",
  );
  expect(service).toHaveValue("worker");
  await user.clear(service);
  await user.type(service, "custom-service");
  await user.click(screen.getByRole("button", { name: "Apply filters" }));
  expect(window.location.search).toContain("service=custom-service");
});
