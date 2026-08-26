import { useEffect, useRef, useState } from "react";
import { MessageSquareText, X, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp } from "@/context/AppContext";
import * as api from "@/lib/api";

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function Kora() {
  const { t, koraOpen, setKoraOpen } = useApp();
  const [messages, setMessages] = useState([]); // {id, role:'user'|'kora', text}
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, thinking]);

  useEffect(() => {
    if (koraOpen && inputRef.current) inputRef.current.focus();
  }, [koraOpen]);

  const send = async () => {
    const text = input.trim();
    if (!text || thinking) return;
    setMessages((m) => [...m, { id: makeId(), role: "user", text }]);
    setInput("");
    setThinking(true);
    try {
      const reply = await api.sendKoraMessage(text);
      setMessages((m) => [...m, { id: makeId(), role: "kora", text: reply || t("kora_error") }]);
    } catch {
      setMessages((m) => [...m, { id: makeId(), role: "kora", text: t("kora_error"), error: true }]);
    } finally {
      setThinking(false);
    }
  };

  const onKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  if (!koraOpen) {
    return (
      <button
        onClick={() => setKoraOpen(true)}
        aria-label={t("kora_open")}
        className="fixed bottom-5 right-5 z-[600] inline-flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg transition-transform hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <MessageSquareText className="h-[18px] w-[18px]" aria-hidden="true" />
        {t("kora")}
      </button>
    );
  }

  return (
    <div
      role="dialog"
      aria-label={t("kora")}
      className="fixed bottom-0 right-0 z-[600] flex h-[70vh] max-h-[560px] w-full flex-col border border-border bg-card shadow-2xl sm:bottom-5 sm:right-5 sm:h-[520px] sm:w-[380px] sm:rounded-xl"
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-primary text-primary-foreground">
            <MessageSquareText className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="text-sm font-semibold text-foreground">{t("kora")}</span>
        </div>
        <button
          onClick={() => setKoraOpen(false)}
          aria-label={t("kora_close")}
          className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-[18px] w-[18px]" />
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <p className="mt-2 text-center text-sm text-muted-foreground">{t("kora_intro")}</p>
        )}
        {messages.map((m) => (
          <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm leading-relaxed",
                m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : m.error
                  ? "border border-destructive/40 bg-destructive/10 text-destructive"
                  : "bg-secondary text-secondary-foreground"
              )}
            >
              {m.text}
            </div>
          </div>
        ))}
        {thinking && (
          <div className="flex justify-start">
            <div className="rounded-lg bg-secondary px-3 py-2 text-sm text-muted-foreground">{t("kora_thinking")}</div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 border-t border-border p-3">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKey}
          placeholder={t("kora_placeholder")}
          aria-label={t("kora_placeholder")}
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <button
          onClick={send}
          disabled={thinking || !input.trim()}
          aria-label={t("kora_send")}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Send className="h-[18px] w-[18px]" />
        </button>
      </div>
    </div>
  );
}
