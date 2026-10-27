import { createContext, useCallback, useContext, useEffect, useState } from "react";

const ThemeContext = createContext(null);
const STORAGE_KEY = "theme";

function systemTheme() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function savedTheme() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : null;
  } catch {
    return null; // storage blocked (e.g. private mode)
  }
}

/**
 * Light/dark theme. Follows the OS setting until the user picks one with the
 * toggle; after that their choice is remembered. index.html applies the same
 * logic before React loads so the page never flashes the wrong theme.
 */
export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => savedTheme() || systemTheme());

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Keep following OS changes until the user makes an explicit choice.
  useEffect(() => {
    if (savedTheme()) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e) => { if (!savedTheme()) setThemeState(e.matches ? "dark" : "light"); };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      try { localStorage.setItem(STORAGE_KEY, next); } catch { /* ignore */ }
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
