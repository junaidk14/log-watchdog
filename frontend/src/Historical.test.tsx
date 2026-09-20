import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import axe from "axe-core";
import { Router } from "./Router";
import { HistoricalTrends, HistoricalUpload } from "./Historical";

const fetchMock = vi.fn();
const row = {
  sequence: 1,
  event_id: "import-1",
  timestamp: "2026-01-01T12:00:00.000000Z",
  service: "checkout",
  severity: "ERROR",
  message: "Synthetic timeout",
  metadata: {},
  ingested_at: "2026-01-01T12:00:01Z",
};
const completed = {
  inserted: 1,
  duplicates: 1,
  start: row.timestamp,
  end: row.timestamp,
};
const trends = {
  total: 1,
  start: row.timestamp,
  end: row.timestamp,
  bucket_seconds: 60,
  buckets: [
    {
      start: row.timestamp,
      end: "2026-01-01T12:01:00.000000Z",
      total: 1,
      errors: 1,
      rate: 1,
    },
  ],
};
const respond = (body: unknown, ok = true, status = 200) => ({
  ok,
  status,
  json: async () => body,
});
beforeEach(() => {
  window.history.replaceState({}, "", "?view=logs&dataset=historical");
  vi.stubGlobal("scrollTo", vi.fn());
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
});
afterEach(() => vi.restoreAllMocks());

it("uploads with keyboard submission, reports counts, browses the file interval and filters its logs", async () => {
  let imported = false;
  fetchMock.mockImplementation(async (url: string) => {
    if (url === "/api/historical/upload") {
      imported = true;
      return respond(completed);
    }
    if (url.startsWith("/api/historical/trends"))
      return respond(imported ? trends : { total: 0, buckets: [] });
    return respond({
      dataset: "historical",
      total: imported ? 1 : 0,
      page: 1,
      page_size: 50,
      events: imported ? [row] : [],
    });
  });
  const user = userEvent.setup();
  const { container } = render(<Router />);
  await screen.findByText(/No historical events in this service/);
  expect(screen.getByText(/up to 5,000 events \(5 MB\)/)).toHaveTextContent(
    "5,000 events",
  );
  const file = new File([JSON.stringify([row])], "synthetic.json", {
    type: "application/json",
  });
  await user.upload(screen.getByLabelText("JSON log file"), file);
  const button = screen.getByRole("button", { name: "Import into Historical" });
  button.focus();
  await user.keyboard("{Enter}");
  await screen.findByText(/Import complete: 1 inserted · 1 duplicates/);
  expect(button).toHaveFocus();
  expect(
    fetchMock.mock.calls.find(
      (call) => call[0] === "/api/historical/upload",
    )![1].body.byteLength,
  ).toBe(file.size);
  await user.click(
    screen.getByRole("button", { name: "Browse file interval" }),
  );
  await screen.findByText("Synthetic timeout");
  expect(new URLSearchParams(window.location.search).get("start")).toBe(
    row.timestamp,
  );
  await user.type(screen.getByLabelText("Service"), "checkout");
  await user.type(screen.getByLabelText("Message contains"), "timeout");
  await user.selectOptions(screen.getByLabelText("Severity"), "ERROR");
  await user.click(screen.getByRole("button", { name: "Apply filters" }));
  await waitFor(() =>
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("message=timeout"),
      expect.anything(),
    ),
  );
  const trendCall = fetchMock.mock.calls
    .filter((call) => call[0].startsWith("/api/historical/trends"))
    .at(-1)![0];
  expect(trendCall).toContain("service=checkout");
  expect(trendCall).not.toContain("severity");
  expect(trendCall).not.toContain("message");
  await user.click(screen.getByText("Exact historical trend values · UTC"));
  expect(
    screen.getByRole("region", { name: "Historical trend values" }),
  ).toHaveAttribute("tabindex", "0");
  expect(screen.getByText("100.00%")).toBeVisible();
  const results = await axe.run(container, {
    rules: { "color-contrast": { enabled: false } },
  });
  expect(results.violations).toEqual([]);
});

it("rejects oversized files locally and keeps the selected file for correction", async () => {
  render(<HistoricalUpload onImported={vi.fn()} onBrowse={vi.fn()} />);
  const input = screen.getByLabelText("JSON log file");
  const file = new File(["x"], "large.json", { type: "application/json" });
  Object.defineProperty(file, "size", { value: 5_000_001 });
  await userEvent.upload(input, file);
  await userEvent.click(
    screen.getByRole("button", { name: "Import into Historical" }),
  );
  expect(screen.getByRole("alert")).toHaveTextContent("File exceeds 5 MB");
  expect(fetchMock).not.toHaveBeenCalled();
  expect((input as HTMLInputElement).files?.[0]).toBe(file);
});

it("accepts the exact byte boundary, shows pending progress and blocks repeated submission", async () => {
  let finish!: (value: unknown) => void;
  fetchMock.mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  render(<HistoricalUpload onImported={vi.fn()} onBrowse={vi.fn()} />);
  const file = new File(["[]"], "exact.json", { type: "application/json" });
  Object.defineProperty(file, "size", { value: 5_000_000 });
  await userEvent.upload(screen.getByLabelText("JSON log file"), file);
  await userEvent.click(
    screen.getByRole("button", { name: "Import into Historical" }),
  );
  await screen.findByText("Uploading and validating events…");
  expect(screen.getByRole("progressbar")).toBeVisible();
  expect(
    screen.getByRole("button", { name: "Import into Historical" }),
  ).toBeDisabled();
  fireEvent.submit(screen.getByRole("form"));
  expect(fetchMock).toHaveBeenCalledTimes(1);
  await act(async () => finish(respond(completed)));
  expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
});

it.each([
  ["malformed", "Malformed JSON. Choose a UTF-8 JSON array of events."],
  [
    "invalid row",
    [
      {
        loc: ["events", 1, "timestamp"],
        msg: "timestamp must include a timezone",
      },
    ],
  ],
  [
    "conflict",
    "Row 2: event_id conflicts with different content. No events imported.",
  ],
])(
  "shows actionable %s feedback without a success state",
  async (_, detail) => {
    fetchMock.mockResolvedValue(respond({ detail }, false, 422));
    const imported = vi.fn();
    render(<HistoricalUpload onImported={imported} onBrowse={vi.fn()} />);
    await userEvent.upload(
      screen.getByLabelText("JSON log file"),
      new File(["[]"], "bad.json", { type: "application/json" }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Import into Historical" }),
    );
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      typeof detail === "string" ? detail : "Row 2, timestamp",
    );
    expect(screen.queryByText(/Import complete/)).not.toBeInTheDocument();
    expect(imported).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "Import into Historical" }),
    ).toBeEnabled();
  },
);

it("shows file-read failures without sending and clears prior completion on another attempt", async () => {
  fetchMock.mockResolvedValue(respond(completed));
  render(<HistoricalUpload onImported={vi.fn()} onBrowse={vi.fn()} />);
  await userEvent.upload(
    screen.getByLabelText("JSON log file"),
    new File(["[]"], "logs.json", { type: "application/json" }),
  );
  await userEvent.click(
    screen.getByRole("button", { name: "Import into Historical" }),
  );
  await screen.findByText(/Import complete/);
  vi.spyOn(FileReader.prototype, "readAsArrayBuffer").mockImplementation(
    function (this: FileReader) {
      this.dispatchEvent(new ProgressEvent("error"));
    },
  );
  await userEvent.click(
    screen.getByRole("button", { name: "Import into Historical" }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Could not read the file",
  );
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(screen.queryByText(/Import complete/)).not.toBeInTheDocument();
});

it("retains input on connection failure and explains uncertain retries", async () => {
  fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
  render(<HistoricalUpload onImported={vi.fn()} onBrowse={vi.fn()} />);
  await userEvent.upload(
    screen.getByLabelText("JSON log file"),
    new File(["[]"], "logs.json", { type: "application/json" }),
  );
  await userEvent.click(
    screen.getByRole("button", { name: "Import into Historical" }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "inspect Historical before retrying",
  );
  await userEvent.click(screen.getByText("File format and retry guidance"));
  expect(screen.getByText(/Identical supplied IDs deduplicate/)).toBeVisible();
});

it("retries trends and ignores stale filter responses", async () => {
  let finish!: (value: unknown) => void;
  fetchMock.mockRejectedValueOnce(new Error("offline"));
  const view = render(
    <HistoricalTrends service="checkout" start="" end="" revision={0} />,
  );
  await screen.findByRole("alert");
  fetchMock.mockReturnValueOnce(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  await userEvent.click(screen.getByRole("button", { name: "Retry trends" }));
  fetchMock.mockResolvedValueOnce(respond({ total: 0, buckets: [] }));
  view.rerender(
    <HistoricalTrends service="worker" start="" end="" revision={0} />,
  );
  await screen.findByText(/No historical events/);
  await act(async () => finish(respond(trends)));
  expect(screen.queryByRole("img")).not.toBeInTheDocument();
});
