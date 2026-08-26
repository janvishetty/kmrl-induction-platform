import { useEffect, useRef, useState } from "react";
import { MessageSquareText, X, Send, Copy, Check } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import { useApp } from "@/context/AppContext";
import * as api from "@/lib/api";

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function MarkdownMessage({ text }) {
  return (
    <div className="kora-markdown text-sm leading-6">
      <ReactMarkdown
        components={{
          p: ({ children }) => (
            <p className="mb-3 last:mb-0">{children}</p>
          ),

          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">
              {children}
            </strong>
          ),

          em: ({ children }) => (
            <em className="text-muted-foreground">{children}</em>
          ),

          h1: ({ children }) => (
            <h1 className="mb-3 mt-4 text-lg font-bold first:mt-0">
              {children}
            </h1>
          ),

          h2: ({ children }) => (
            <h2 className="mb-2 mt-4 text-base font-bold first:mt-0">
              {children}
            </h2>
          ),

          h3: ({ children }) => (
            <h3 className="mb-2 mt-3 text-sm font-bold first:mt-0">
              {children}
            </h3>
          ),

          ul: ({ children }) => (
            <ul className="mb-3 ml-5 list-disc space-y-1">
              {children}
            </ul>
          ),

          ol: ({ children }) => (
            <ol className="mb-3 ml-5 list-decimal space-y-1">
              {children}
            </ol>
          ),

          li: ({ children }) => (
            <li className="pl-1">{children}</li>
          ),

          blockquote: ({ children }) => (
            <blockquote className="my-3 border-l-2 border-primary/40 pl-3 text-muted-foreground">
              {children}
            </blockquote>
          ),

          code: ({ children }) => (
            <code className="break-all rounded-md bg-background/80 px-1.5 py-1 font-mono text-[11px] text-foreground">
              {children}
            </code>
          ),

          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary underline underline-offset-2 hover:opacity-80"
            >
              {children}
            </a>
          ),

          hr: () => <hr className="my-4 border-border" />,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

function CopyHashButton({ value }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 1500);
    } catch {
      // Clipboard may be unavailable.
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      title="Copy hash"
    >
      {copied ? (
        <>
          <Check className="h-3 w-3" />
          Copied
        </>
      ) : (
        <>
          <Copy className="h-3 w-3" />
          Copy
        </>
      )}
    </button>
  );
}

function getKoraErrorMessage(error) {
  const status = error?.response?.status;
  const detail = error?.response?.data?.detail;

  // Gemini / AI quota
  if (status === 429) {
    return (
      "Kora is temporarily unavailable because the AI service has reached its usage limit. " +
      "Please try again later."
    );
  }

  // Backend returned a useful error
  if (detail) {
    if (typeof detail === "string") {
      return `Kora couldn't complete the request: ${detail}`;
    }

    try {
      return `Kora couldn't complete the request: ${JSON.stringify(detail)}`;
    } catch {
      return "Kora couldn't complete the request.";
    }
  }

  // Backend didn't respond
  if (error?.request && !error?.response) {
    return (
      "Kora couldn't reach the document service. " +
      "Please make sure the backend is running."
    );
  }

  return "Kora couldn't complete the request. Please try again.";
}

export function Kora() {
  const { t, koraOpen, setKoraOpen } = useApp();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);

  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, thinking]);

  useEffect(() => {
    if (koraOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [koraOpen]);

  const send = async () => {
    const text = input.trim();

    if (!text || thinking) return;

    setMessages((m) => [
      ...m,
      {
        id: makeId(),
        role: "user",
        text,
      },
    ]);

    setInput("");
    setThinking(true);

    try {
      console.log("Kora request:", text);

      const reply = await api.sendKoraMessage(text);

      console.log("Kora response:", reply);

      setMessages((m) => [
        ...m,
        {
          id: makeId(),
          role: "kora",
          text: reply || "Kora returned an empty response.",
        },
      ]);
    } catch (error) {
      console.error("Kora API error:", error);

      setMessages((m) => [
        ...m,
        {
          id: makeId(),
          role: "kora",
          text: getKoraErrorMessage(error),
          error: true,
        },
      ]);
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
        className="fixed bottom-5 right-5 z-[600] inline-flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg transition-all hover:scale-[1.03] hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <MessageSquareText
          className="h-[18px] w-[18px]"
          aria-hidden="true"
        />
        {t("kora")}
      </button>
    );
  }

  return (
    <div
      role="dialog"
      aria-label={t("kora")}
      className="fixed bottom-0 right-0 z-[600] flex h-[78vh] max-h-[680px] w-full flex-col overflow-hidden border border-border bg-card shadow-2xl sm:bottom-5 sm:right-5 sm:h-[620px] sm:w-[430px] sm:rounded-2xl"
    >
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-border bg-card px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <MessageSquareText
              className="h-5 w-5"
              aria-hidden="true"
            />
          </span>

          <div>
            <div className="text-sm font-semibold text-foreground">
              {t("kora")}
            </div>

            <div className="text-[11px] text-muted-foreground">
              KMRL Document Assistant
            </div>
          </div>
        </div>

        <button
          onClick={() => setKoraOpen(false)}
          aria-label={t("kora_close")}
          className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto bg-background/40 px-4 py-5"
      >
        {messages.length === 0 && (
          <div className="flex min-h-full items-center justify-center">
            <div className="max-w-[300px] text-center">
              <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                <MessageSquareText className="h-6 w-6" />
              </div>

              <p className="text-sm font-medium text-foreground">
                {t("kora")}
              </p>

              <p className="mt-1 text-sm leading-5 text-muted-foreground">
                {t("kora_intro")}
              </p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={cn(
                "flex",
                m.role === "user"
                  ? "justify-end"
                  : "justify-start"
              )}
            >
              <div
                className={cn(
                  "rounded-2xl px-4 py-3 shadow-sm",
                  m.role === "user"
                    ? "max-w-[82%] rounded-br-md bg-primary text-primary-foreground"
                    : "w-full max-w-[94%] rounded-bl-md border border-border bg-card text-secondary-foreground",
                  m.error &&
                    "border-destructive/30 bg-destructive/10 text-destructive"
                )}
              >
                {m.role === "kora" ? (
                  <MarkdownMessage text={m.text} />
                ) : (
                  <div className="whitespace-pre-wrap text-sm leading-6">
                    {m.text}
                  </div>
                )}
              </div>
            </div>
          ))}

          {thinking && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-border bg-card px-4 py-3 shadow-sm">
                <span className="flex gap-1">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" />
                </span>

                <span className="text-xs text-muted-foreground">
                  {t("kora_thinking")}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-border bg-card p-3">
        <div className="flex items-center gap-2 rounded-xl border border-input bg-background p-1.5 transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            placeholder={t("kora_placeholder")}
            aria-label={t("kora_placeholder")}
            className="min-w-0 flex-1 border-0 bg-transparent px-2 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />

          <button
            onClick={send}
            disabled={thinking || !input.trim()}
            aria-label={t("kora_send")}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-2 text-center text-[10px] text-muted-foreground">
          Press Enter to send
        </p>
      </div>
    </div>
  );
}
