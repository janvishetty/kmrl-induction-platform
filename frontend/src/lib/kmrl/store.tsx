import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  documents as seedDocs,
  seedAudit,
  type AuditEntry,
  type KDocument,
  type Lang,
} from "./data";
import { translate } from "./i18n";
import type { MapFocus } from "./kora";

export type Theme = "light" | "dark";

interface AppState {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  docs: KDocument[];
  addDoc: (doc: KDocument) => void;
  audit: AuditEntry[];
  log: (entry: Omit<AuditEntry, "id" | "at">) => void;
  mapFocus: MapFocus | null;
  setMapFocus: (f: MapFocus | null) => void;
  koraOpen: boolean;
  setKoraOpen: (v: boolean) => void;
  koraQuestion: { text: string; ts: number } | null;
  askKoraAbout: (text: string) => void;
}

const Ctx = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("en");
  const [docs, setDocs] = useState<KDocument[]>(seedDocs);
  const [audit, setAudit] = useState<AuditEntry[]>(seedAudit);
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return "dark";
    const stored = window.localStorage.getItem("kmrl-theme");
    return stored === "light" || stored === "dark" ? stored : "dark";
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.style.colorScheme = theme;
    window.localStorage.setItem("kmrl-theme", theme);
  }, [theme]);


  const setTheme = useCallback((t: Theme) => setThemeState(t), []);
  const toggleTheme = useCallback(
    () => setThemeState((p) => (p === "dark" ? "light" : "dark")),
    [],
  );


  const log = useCallback((entry: Omit<AuditEntry, "id" | "at">) => {
    setAudit((prev) => [
      { ...entry, id: `AUD-${Math.floor(Math.random() * 9000) + 1000}`, at: new Date().toISOString() },
      ...prev,
    ]);
  }, []);

  const addDoc = useCallback((doc: KDocument) => setDocs((prev) => [doc, ...prev]), []);

  const [mapFocus, setMapFocusState] = useState<MapFocus | null>(null);
  const [koraOpen, setKoraOpen] = useState(false);
  const [koraQuestion, setKoraQuestion] = useState<{ text: string; ts: number } | null>(null);

  const setMapFocus = useCallback(
    (f: MapFocus | null) => setMapFocusState(f ? { ...f, ts: Date.now() } : null),
    [],
  );
  const askKoraAbout = useCallback((text: string) => {
    setKoraOpen(true);
    setKoraQuestion({ text, ts: Date.now() });
  }, []);

  const value = useMemo<AppState>(
    () => ({
      lang,
      setLang,
      t: (k: string) => translate(k, lang),
      theme,
      setTheme,
      toggleTheme,
      docs,
      addDoc,
      audit,
      log,
      mapFocus,
      setMapFocus,
      koraOpen,
      setKoraOpen,
      koraQuestion,
      askKoraAbout,
    }),
    [lang, theme, setTheme, toggleTheme, docs, audit, log, addDoc, mapFocus, setMapFocus, koraOpen, koraQuestion, askKoraAbout],

  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
