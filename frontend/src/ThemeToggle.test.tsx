import { act, render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ThemeToggle } from "./ThemeToggle";

let dark = true;
let change: (() => void) | undefined;
beforeEach(() => {
  const values = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    clear: () => values.clear(),
  });
  delete document.documentElement.dataset.theme;
  dark = true;
  change = undefined;
  vi.stubGlobal("matchMedia", () => ({
    matches: dark,
    addEventListener: (_: string, listener: () => void) => {
      change = listener;
    },
    removeEventListener: vi.fn(),
  }));
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  delete document.documentElement.dataset.theme;
});

it("follows the system until an explicit selection, then persists across remounts", async () => {
  const user = userEvent.setup();
  const mounted = render(<ThemeToggle />);
  expect(document.documentElement).toHaveAttribute("data-theme", "dark");
  expect(localStorage.getItem("log-watchdog-theme")).toBeNull();
  act(() => {
    dark = false;
    change?.();
  });
  const toggle = screen.getByRole("button", { name: "Switch to dark mode" });
  expect(toggle).toHaveAttribute("title", "Switch to dark mode");
  toggle.focus();
  await user.keyboard("{Enter}");
  expect(toggle).toHaveFocus();
  expect(localStorage.getItem("log-watchdog-theme")).toBe("dark");
  act(() => change?.());
  expect(document.documentElement).toHaveAttribute("data-theme", "dark");
  mounted.unmount();
  render(<ThemeToggle />);
  expect(
    screen.getByRole("button", { name: "Switch to light mode" }),
  ).toBeVisible();
});

it("ignores invalid storage and switches even when persistence is blocked", async () => {
  localStorage.setItem("log-watchdog-theme", "invalid");
  render(<ThemeToggle />);
  vi.spyOn(localStorage, "setItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  await userEvent.click(
    screen.getByRole("button", { name: "Switch to light mode" }),
  );
  expect(document.documentElement).toHaveAttribute("data-theme", "light");
});

it("uses an explicit stored theme over the system and synchronizes other tabs", () => {
  localStorage.setItem("log-watchdog-theme", "light");
  render(<ThemeToggle />);
  expect(document.documentElement).toHaveAttribute("data-theme", "light");
  localStorage.setItem("log-watchdog-theme", "dark");
  act(() =>
    window.dispatchEvent(
      new StorageEvent("storage", { key: "log-watchdog-theme" }),
    ),
  );
  expect(document.documentElement).toHaveAttribute("data-theme", "dark");
});
