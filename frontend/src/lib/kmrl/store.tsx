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
import { fetchDocuments } from "./api";
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
  docsLoading: boolean;
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
  const [docsLoading, setDocsLoading] = useState(true);
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return "dark";
    const stored = window.localStorage.getItem("kmrl-theme");
    return stored === "light" || stored === "dark" ? stored : "dark";
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem("kmrl-theme", theme);
  }, [theme]);

  useEffect(() => {
  async function loadDocs() {
    try {
      const backendDocs = await fetchDocuments(); // already camelCased by api.ts
      const mapped: KDocument[] = backendDocs.map((d: any) => ({
        id: d.id,
        title: d.title ?? d.fileName.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " "),
        titleMl: d.titleMl ?? `അപ്‌ലോഡ് ചെയ്ത രേഖ — ${d.fileName}`,
        fileName: d.fileName,
        format: d.format ?? "PDF",
        type: d.docType ?? "Maintenance Log",
        department: d.department ?? "Operations",
        language: d.language ?? "en",
        uploadedBy: d.uploadedBy ?? "Duty Controller (You)",
        uploadedAt: d.uploadedAt,
        effectiveFrom: d.effectiveFrom ?? undefined,
        expiresOn: d.expiresOn ?? undefined,
        trainsets: d.trainsets ?? [],
        employeeIds: d.employeeIds ?? [],
        confidence: d.confidence ?? 0,
        status: d.status === "uploaded" ? "Indexed" : (d.status ?? "Indexed"),
        tags: d.tags ?? ["uploaded"],
        chunks: d.chunks ?? [],
      }));
      const sortedMapped = mapped.sort(
        (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
      );
      setDocs((prev) => {
        const seedIds = new Set(seedDocs.map((d) => d.id));
        const realOnly = sortedMapped.filter((d) => !seedIds.has(d.id));
        return [...realOnly, ...seedDocs];
      });
    } catch (err) {
      console.error("Failed to fetch documents:", err);
    } finally {
      setDocsLoading(false);
    }
  }
  loadDocs();
}, []);


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
      docsLoading,
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
    [lang, theme, setTheme, toggleTheme, docs, docsLoading, audit, log, addDoc, mapFocus, setMapFocus, koraOpen, koraQuestion, askKoraAbout],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
