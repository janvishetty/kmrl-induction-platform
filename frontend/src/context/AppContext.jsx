import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { translate } from "@/i18n";

const AppContext = createContext(null);

function getInitialTheme() {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem("raildhara-theme");
  if (stored === "light" || stored === "dark") return stored;
  const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  return prefersDark ? "dark" : "light";
}

function getInitialLang() {
  if (typeof window === "undefined") return "en";
  const stored = window.localStorage.getItem("raildhara-lang");
  return stored === "ml" ? "ml" : "en";
}

export function AppProvider({ children }) {
  const [theme, setThemeState] = useState(getInitialTheme);
  const [lang, setLangState] = useState(getInitialLang);
  const [koraOpen, setKoraOpen] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem("raildhara-theme", theme);
  }, [theme]);

  useEffect(() => {
    window.localStorage.setItem("raildhara-lang", lang);
    document.documentElement.setAttribute("lang", lang);
  }, [lang]);

  const setTheme = useCallback((t) => setThemeState(t), []);
  const toggleTheme = useCallback(() => setThemeState((p) => (p === "dark" ? "light" : "dark")), []);
  const setLang = useCallback((l) => setLangState(l), []);
  const toggleLang = useCallback(() => setLangState((p) => (p === "en" ? "ml" : "en")), []);

  const t = useCallback((key) => translate(key, lang), [lang]);

  // Exporting BOTH `lang` and `language` so any component can use either one seamlessly
  const value = useMemo(
    () => ({ 
      theme, 
      setTheme, 
      toggleTheme, 
      lang, 
      language: lang, // <--- Added alias so language checks never fail
      setLang, 
      toggleLang, 
      t, 
      koraOpen, 
      setKoraOpen 
    }),
    [theme, setTheme, toggleTheme, lang, setLang, toggleLang, t, koraOpen]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}