import { useEffect, useRef, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Bot, Send, X, Minus, Radar } from "lucide-react";
import { askKora, KORA_SUGGESTIONS, type KoraReply, type MapFocus } from "@/lib/kmrl/kora";
import { stateColor } from "@/lib/kmrl/network";
import { useApp } from "@/lib/kmrl/store";
import { cn } from "@/lib/utils";

interface Msg {
  id: string;
  role: "user" | "kora";
  text: string;
  reply?: KoraReply;
}

const GREETING: Msg = {
  id: "m0",
  role: "kora",
  text:
    "KORA online. I have the live network picture — stations, trainsets, maintenance works, alerts and staff readiness. Ask me anything, and I can highlight it on the SmartMap.",
};

export function Kora() {
  const { koraOpen, setKoraOpen, koraQuestion, setMapFocus, log } = useApp();
  const [messages, setMessages] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const submit = (text: string) => {
    const q = text.trim();
    if (!q) return;
    setMessages((prev) => [...prev, { id: `u${Date.now()}`, role: "user", text: q }]);
    setInput("");
    setThinking(true);
    window.setTimeout(() => {
      const reply = askKora(q);
      setMessages((prev) => [...prev, { id: `k${Date.now()}`, role: "kora", text: reply.answer, reply }]);
      setThinking(false);
      log({ actor: "Duty Controller", action: "QA", target: "KORA", detail: `Asked KORA: "${q}"` });
    }, 420);
  };

  useEffect(() => {
    if (koraQuestion) submit(koraQuestion.text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [koraQuestion?.ts]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  useEffect(() => {
    if (koraOpen) inputRef.current?.focus();
  }, [koraOpen, messages]);

  const runFocus = (focus: MapFocus) => {
    setMapFocus(focus);
    setKoraOpen(false);
    if (pathname !== "/smartmap") navigate({ to: "/smartmap" });
  };

  if (!koraOpen) {
    return (
      <button
        onClick={() => setKoraOpen(true)}
        className="fixed bottom-5 right-5 z-[2000] flex items-center gap-2.5 rounded-full border border-primary/50 bg-card/95 py-2.5 pl-2.5 pr-4 shadow-lg backdrop-blur transition-colors hover:border-primary"
        aria-label="Open KORA assistant"
      >
        <span className="grid size-8 place-items-center rounded-full bg-primary/15 text-primary">
          <Radar className="size-4" />
        </span>
        <span className="text-left">
          <span className="block text-xs font-semibold text-foreground">KORA</span>
          <span className="block font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
            Rail assistant
          </span>
        </span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 z-[2000] flex h-[min(620px,80vh)] w-[min(400px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-lg border border-border bg-card shadow-2xl">
      <header className="flex items-center gap-3 border-b border-border bg-sidebar px-4 py-3">
        <span className="grid size-9 place-items-center rounded-md bg-primary/15 text-primary">
          <Radar className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-tight">KORA</p>
          <p className="mono-label truncate">KMRL Operations &amp; Rail Assistant</p>
        </div>
        <span className="flex items-center gap-1.5 rounded-full border border-success/40 bg-success/10 px-2 py-0.5 text-[10px] text-success">
          <span className="size-1.5 animate-pulse rounded-full bg-success" /> live
        </span>
        <button onClick={() => setKoraOpen(false)} className="text-muted-foreground hover:text-foreground" aria-label="Minimise">
          <Minus className="size-4" />
        </button>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.map((m) =>
          m.role === "user" ? (
            <div key={m.id} className="flex justify-end">
              <p className="max-w-[85%] rounded-lg rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground">
                {m.text}
              </p>
            </div>
          ) : (
            <div key={m.id} className="space-y-2">
              <div className="flex items-start gap-2">
                <Bot className="mt-0.5 size-4 shrink-0 text-primary" />
                <p className="text-sm leading-relaxed text-foreground">{m.text}</p>
              </div>
              {m.reply && m.reply.rows.length > 0 && (
                <div className="ml-6 divide-y divide-border overflow-hidden rounded-md border border-border">
                  {m.reply.rows.map((r, i) => (
                    <div key={i} className="flex gap-2 px-2.5 py-1.5 text-[11px]">
                      {r.state && (
                        <span
                          className="mt-1 size-1.5 shrink-0 rounded-full"
                          style={{ background: stateColor[r.state] }}
                        />
                      )}
                      <span className="w-1/3 shrink-0 font-medium text-foreground">{r.label}</span>
                      <span className="flex-1 text-muted-foreground">{r.value}</span>
                    </div>
                  ))}
                </div>
              )}
              {m.reply && m.reply.actions.length > 0 && (
                <div className="ml-6 flex flex-wrap gap-2">
                  {m.reply.actions.map((a) => (
                    <button
                      key={a.label}
                      onClick={() => runFocus(a.focus)}
                      className="rounded border border-primary/50 bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary transition-colors hover:bg-primary/20"
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ),
        )}
        {thinking && (
          <p className="ml-6 animate-pulse font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            Querying operational data…
          </p>
        )}
        {messages.length <= 1 && (
          <div className="ml-6 space-y-1.5 pt-2">
            <p className="mono-label">Try asking</p>
            {KORA_SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => submit(s)}
                className="block w-full rounded border border-border px-2 py-1.5 text-left text-[11px] text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(input);
        }}
        className="border-t border-border p-3"
      >
        <div className="flex items-end gap-2 rounded-md border border-input bg-background px-2.5 py-2">
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit(input);
              }
            }}
            placeholder="Ask KORA about stations, trains, maintenance…"
            className="max-h-24 flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className={cn(
              "grid size-7 shrink-0 place-items-center rounded bg-primary text-primary-foreground transition-opacity",
              !input.trim() && "opacity-40",
            )}
            aria-label="Send"
          >
            <Send className="size-3.5" />
          </button>
        </div>
      </form>
    </div>
  );
}

export { X };
