import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import { GeminiSetup } from "./GeminiSetup";

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
const reply = (configured: boolean) => ({
  ok: true,
  json: async () => ({ configured }),
});

it("sends the typed key only in the backend request, clears the field and supports clear", async () => {
  fetchMock
    .mockResolvedValueOnce(reply(false))
    .mockResolvedValueOnce(reply(true))
    .mockResolvedValueOnce(reply(false));
  const storage = vi.spyOn(Storage.prototype, "setItem");
  const changed = vi.fn();
  const user = userEvent.setup();
  render(<GeminiSetup disabled={false} onChanged={changed} />);
  await user.click(screen.getByRole("button", { name: "Gemini setup" }));
  expect(await screen.findByText("Not configured")).toBeInTheDocument();
  const input = screen.getByLabelText("Gemini API key");
  expect(input).toHaveAttribute("type", "password");
  await user.type(input, "synthetic-session-key");
  await user.click(
    screen.getByRole("button", { name: "Use key for this session" }),
  );
  expect(input).toHaveValue("");
  expect(await screen.findByText("Configured")).toBeInTheDocument();
  expect(fetchMock.mock.calls[1][0]).toBe("/api/analysis/key");
  expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({
    key: "synthetic-session-key",
  });
  expect(fetchMock.mock.calls[1][1].headers["X-Log-Watchdog-Settings"]).toBe(
    "1",
  );
  expect(document.body).not.toHaveTextContent("synthetic-session-key");
  expect(storage).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Clear key" }));
  expect(await screen.findByText("Not configured")).toBeInTheDocument();
  expect(fetchMock.mock.calls[2][1].method).toBe("DELETE");
  expect(changed).toHaveBeenCalledTimes(2);
  storage.mockRestore();
});

it("does not display a credential echoed in an error body or exception", async () => {
  fetchMock
    .mockResolvedValueOnce(reply(false))
    .mockResolvedValueOnce({
      ok: false,
      status: 422,
      json: async () => ({ detail: "synthetic-secret-echo" }),
    })
    .mockRejectedValueOnce(new Error("synthetic-secret-echo"));
  const user = userEvent.setup();
  render(<GeminiSetup disabled={false} onChanged={vi.fn()} />);
  await user.click(screen.getByRole("button", { name: "Gemini setup" }));
  await screen.findByText("Not configured");
  await user.type(
    screen.getByLabelText("Gemini API key"),
    "synthetic-secret-echo",
  );
  await user.click(
    screen.getByRole("button", { name: "Use key for this session" }),
  );
  expect(await screen.findByRole("alert")).not.toHaveTextContent(
    "synthetic-secret-echo",
  );
  expect(screen.getByLabelText("Gemini API key")).toHaveValue("");
  await user.click(screen.getByRole("button", { name: "Refresh key status" }));
  await waitFor(() =>
    expect(screen.getByRole("alert")).toHaveTextContent("unavailable"),
  );
  expect(document.body).not.toHaveTextContent("synthetic-secret-echo");
});
