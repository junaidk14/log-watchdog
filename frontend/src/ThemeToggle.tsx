import { useEffect, useRef, useState } from "react";

type Theme = "light" | "dark";
const storageKey = "log-watchdog-theme";

function savedTheme(): Theme | null {
  try {
    const value = localStorage.getItem(storageKey);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}
function systemTheme(): Theme {
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}
function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", theme === "dark" ? "#131b22" : "#f4f6f7");
}

export function ThemeToggle() {
  const preference = useRef(savedTheme());
  const [theme, setTheme] = useState<Theme>(
    () => preference.current ?? systemTheme(),
  );
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);
  useEffect(() => {
    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    const followSystem = () => {
      if (preference.current === null) setTheme(systemTheme());
    };
    const syncStorage = (event: StorageEvent) => {
      if (event.key !== storageKey && event.key !== null) return;
      preference.current = savedTheme();
      setTheme(preference.current ?? systemTheme());
    };
    media?.addEventListener("change", followSystem);
    window.addEventListener("storage", syncStorage);
    return () => {
      media?.removeEventListener("change", followSystem);
      window.removeEventListener("storage", syncStorage);
    };
  }, []);
  const label = `Switch to ${theme === "light" ? "dark" : "light"} mode`;
  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label={label}
      title={label}
      onClick={() => {
        const next = theme === "light" ? "dark" : "light";
        preference.current = next;
        try {
          localStorage.setItem(storageKey, next);
        } catch {
          /* Still switch when storage is unavailable. */
        }
        setTheme(next);
      }}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        {theme === "light" ? (
          <path d="M20.4 14.2A8.7 8.7 0 0 1 9.8 3.6 8.7 8.7 0 1 0 20.4 14.2Z" />
        ) : (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </>
        )}
      </svg>
    </button>
  );
}
