// src/app/student/theme/ThemeProvider.tsx
"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import {
  THEMES,
  THEME_LIST,
  DEFAULT_THEME_ID,
  THEME_STORAGE_KEY,
  isThemeId,
  Theme,
  ThemeId,
} from "./themes";

interface ThemeContextValue {
  theme: Theme;
  themeId: ThemeId;
  setThemeId: (id: ThemeId) => void;
  toggleTheme: () => void;
  /** true inside a <ThemeScope>: the theme is pinned and the toggle hides itself */
  isForced: boolean;
  /** true once a real provider exists above (used so nested providers don't create a second state) */
  hasProvider: boolean;
}

// Safe fallback: a component rendered outside any provider simply gets AnushivaDefault.
const ThemeContext = createContext<ThemeContextValue>({
  theme: THEMES[DEFAULT_THEME_ID],
  themeId: DEFAULT_THEME_ID,
  setThemeId: () => {},
  toggleTheme: () => {},
  isForced: true,
  hasProvider: false,
});

function RootThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeIdState] = useState<ThemeId>(DEFAULT_THEME_ID);

  // Load the saved choice after mount (avoids server/client mismatch),
  // and stay in sync if the student changes theme in another tab.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (isThemeId(saved)) setThemeIdState(saved);
    } catch {
      /* storage unavailable: stay on default */
    }

    const onStorage = (e: StorageEvent) => {
      if (e.key === THEME_STORAGE_KEY && isThemeId(e.newValue)) setThemeIdState(e.newValue);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  // Tell the browser which mode is active so native scrollbars, form controls etc. match.
  // Also exposes the mode to CSS (see globals.css) for the slim custom scrollbar.
  useEffect(() => {
    const mode = THEMES[themeId].mode;
    const root = document.documentElement;
    root.style.colorScheme = mode;
    root.setAttribute("data-student-theme", mode);
    return () => {
      root.style.colorScheme = "";
      root.removeAttribute("data-student-theme");
    };
  }, [themeId]);
  const setThemeId = useCallback((id: ThemeId) => {
    setThemeIdState(id);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, id);
    } catch {
      /* ignore */
    }
  }, []);

  const toggleTheme = useCallback(() => {
    const index = THEME_LIST.findIndex((t) => t.id === themeId);
    const next = THEME_LIST[(index + 1) % THEME_LIST.length];
    setThemeId(next.id);
  }, [themeId, setThemeId]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: THEMES[themeId],
      themeId,
      setThemeId,
      toggleTheme,
      isForced: false,
      hasProvider: true,
    }),
    [themeId, setThemeId, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * Put this ONCE in src/app/student/layout.tsx so every student page shares one theme.
 * It is safe to use on a page as well: if a provider already exists above, it just
 * passes children through (no second copy of the state).
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const parent = useContext(ThemeContext);
  if (parent.hasProvider) return <>{children}</>;
  return <RootThemeProvider>{children}</RootThemeProvider>;
}

/**
 * Pins one section of a page to a specific theme, ignoring the student's choice.
 * Used on the dashboard until its child components are migrated.
 */
export function ThemeScope({ themeId, children }: { themeId: ThemeId; children: ReactNode }) {
  const parent = useContext(ThemeContext);
  const value = useMemo<ThemeContextValue>(
    () => ({ ...parent, theme: THEMES[themeId], themeId, isForced: true }),
    [parent, themeId]
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}