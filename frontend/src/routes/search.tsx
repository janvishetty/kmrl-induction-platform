import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Bot, FileSearch, Quote, Sparkles } from "lucide-react";
import { AppShell, Citation, PageHeader } from "@/components/kmrl/AppShell";
import { useApp } from "@/lib/kmrl/store";
import { askQuestion, localized, semanticSearch, type QAResult, type SearchHit } from "@/lib/kmrl/search";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/search")({
  head: () => ({
    meta: [
      { title: "Semantic Search & AI Q&A — KMRL Ops Intelligence" },
      {
        name: "description",
        content:
          "Ask questions in English or Malayalam across every indexed KMRL document and get concise answers with page-level source citations.",
      },
      { property: "og:title", content: "Semantic Search & AI Q&A — KMRL" },
      {
        property: "og:description",
        content: "Concept-level retrieval across KMRL documents with traceable citations.",
      },
    ],
  }),
  component: SearchPage,
});

const SUGGESTIONS = [
  "What blocks TS-11 from entering service tonight?",
  "When does the TS-07 fitness certificate expire?",
  "Who is eligible for night induction duty?",
  "ബ്രാൻഡിംഗ് എക്സ്പോഷർ പിഴ എപ്പോൾ ബാധകമാകും?",
  "How many deep-clean bays are free tonight?",
];

function SearchPage() {
  const { docs, lang, t, log } = useApp();
  const [q, setQ] = useState("");
  const [mode, setMode] = useState<"qa" | "search">("qa");
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const [qa, setQa] = useState<QAResult | null>(null);
  const [busy, setBusy] = useState(false);

  function run(query: string) {
    if (!query.trim()) return;
    setQ(query);
    setBusy(true);
    setTimeout(() => {
      const h = semanticSearch(query, docs);
      setHits(h);
      if (mode === "qa") {
        const a = askQuestion(query, docs);
        setQa(a);
        log({
          actor: "Duty Controller (You)",
          action: "QA",
          target: `"${query}"`,
          detail: `Answer generated at ${(a.confidence * 100).toFixed(0)}% confidence with ${a.citations.length} citations.`,
        });
      } else {
        setQa(null);
        log({
          actor: "Duty Controller (You)",
          action: "SEARCH",
          target: `"${query}"`,
          detail: `${h.length} semantic matches across ${new Set(h.map((x) => x.doc.id)).size} documents.`,
        });
      }
      setBusy(false);
    }, 500);
  }

  return (
    <AppShell>
      <PageHeader
        tag="Bilingual retrieval · EN / മലയാളം"
        title={t("nav_search")}
        subtitle="Concept-level retrieval — a query about 'what stops a train from running' also matches job cards, fitness certificates and stabling plans that never use those words. Every AI answer is grounded in cited passages."
      />

      <div className="panel p-4">
        <div className="mb-3 flex gap-1 rounded-md border border-border p-1 w-fit">
          {(
            [
              { id: "qa", label: t("ask"), icon: Bot },
              { id: "search", label: "Semantic search", icon: FileSearch },
            ] as const
          ).map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={cn(
                "flex items-center gap-2 rounded px-3 py-1.5 text-xs font-medium",
                mode === m.id ? "bg-primary text-primary-foreground" : "text-muted-foreground",
              )}
            >
              <m.icon className="size-3.5" /> {m.label}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(q);
          }}
          className="flex flex-wrap gap-2"
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("search_ph")}
            className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <button
            type="submit"
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            {busy ? "Retrieving…" : mode === "qa" ? "Ask" : "Search"}
          </button>
        </form>

        <div className="mt-3 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => run(s)}
              className="rounded-full border border-border px-3 py-1 text-[11px] text-muted-foreground hover:border-primary/50 hover:text-foreground"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {qa && (
        <section className="panel mt-5 border-primary/40 p-5">
          <p className="mono-label flex items-center gap-2 text-primary">
            <Sparkles className="size-3.5" /> {t("answer")} · confidence {(qa.confidence * 100).toFixed(0)}%
          </p>
          <p className="mt-3 text-sm leading-relaxed">{lang === "ml" ? qa.answerMl : qa.answer}</p>

          <p className="mono-label mt-5 flex items-center gap-2">
            <Quote className="size-3.5 text-accent" /> {t("sources")} ({qa.citations.length})
          </p>
          <ol className="mt-2 space-y-2">
            {qa.citations.map((c, i) => (
              <li key={c.chunk.id} className="rounded-md border border-border bg-secondary/40 p-3">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-mono text-accent">[{i + 1}]</span>
                  <span className="font-medium">{lang === "ml" ? c.doc.titleMl : c.doc.title}</span>
                  <Citation docId={c.doc.id} refLabel={`p.${c.chunk.page} · ${c.chunk.section}`} />
                  <span className="mono-label">{c.doc.fileName}</span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  “{localized(c.chunk, lang)}”
                </p>
              </li>
            ))}
            {qa.citations.length === 0 && (
              <li className="text-xs text-muted-foreground">No supporting passage found.</li>
            )}
          </ol>
        </section>
      )}

      {hits && (
        <section className="mt-5">
          <p className="mono-label mb-2">
            {hits.length} semantic matches across {new Set(hits.map((h) => h.doc.id)).size} documents
          </p>
          <ul className="space-y-2">
            {hits.map((h) => (
              <li key={h.chunk.id} className="panel p-3">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-medium">{lang === "ml" ? h.doc.titleMl : h.doc.title}</span>
                  <Citation docId={h.doc.id} refLabel={`p.${h.chunk.page} · ${h.chunk.section}`} />
                  <span className="mono-label ml-auto">relevance {h.score.toFixed(1)}</span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {localized(h.chunk, lang)}
                </p>
                {h.matched.length > 0 && (
                  <p className="mono-label mt-2">matched concepts: {h.matched.join(", ")}</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </AppShell>
  );
}
