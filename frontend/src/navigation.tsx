import { useEffect, useRef, type ComponentProps } from "react";

export function viewUrl(
  view: string,
  changes: Record<string, string | null> = {},
) {
  const params = new URLSearchParams(window.location.search);
  params.set("view", view);
  Object.entries(changes).forEach(([key, value]) => {
    if (value === null || value === "") params.delete(key);
    else params.set(key, value);
  });
  return `?${params}`;
}

export function PageLink({
  focus,
  back,
  href,
  children,
  ...props
}: ComponentProps<"a"> & { focus?: string; back?: boolean }) {
  return (
    <a
      {...props}
      href={href}
      onClick={(event) => {
        if (
          event.button ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        )
          return;
        event.preventDefault();
        const previous = { scrollY: window.scrollY, focus: props.id };
        const destination = back ? window.history.state?.returnState : null;
        window.history.replaceState(
          { ...window.history.state, ...previous },
          "",
          window.location.href,
        );
        window.history.pushState(
          {
            returnState: previous,
            ...destination,
            focus: destination?.focus || focus,
          },
          "",
          href,
        );
        window.dispatchEvent(
          new PopStateEvent("popstate", { state: window.history.state }),
        );
      }}
    >
      {children}
    </a>
  );
}

function focusVisible(target: HTMLElement | null) {
  if (!target) return false;
  for (
    let element: HTMLElement | null = target;
    element;
    element = element.parentElement
  ) {
    const style = window.getComputedStyle(element);
    if (
      element.hidden ||
      element.inert ||
      style.display === "none" ||
      style.visibility === "hidden"
    )
      return false;
  }
  target.focus({ preventScroll: true });
  return document.activeElement === target;
}

export function usePageRestoration(ready: boolean, fallback?: string) {
  const pending = useRef(true);
  useEffect(() => {
    const mark = () => {
      pending.current = true;
    };
    window.addEventListener("popstate", mark);
    return () => window.removeEventListener("popstate", mark);
  }, []);
  useEffect(() => {
    if (!ready || !pending.current) return;
    const restore = () => {
      const state = window.history.state;
      const target = state?.focus ? document.getElementById(state.focus) : null;
      if (state?.focus && !focusVisible(target)) {
        // Evidence controls arrive asynchronously. Once loading settles, a
        // missing or hidden origin must not leave restoration pending forever.
        if (document.querySelector('main [aria-busy="true"]')) return false;
        focusVisible(fallback ? document.getElementById(fallback) : null);
      }
      if (typeof state?.scrollY === "number") window.scrollTo(0, state.scrollY);
      pending.current = false;
      return true;
    };
    if (restore()) return;
    const observer = new MutationObserver(() => {
      if (restore()) observer.disconnect();
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["aria-busy"],
    });
    return () => observer.disconnect();
  });
}
