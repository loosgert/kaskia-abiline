"use client";

import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { ArrowUp, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MAX_MESSAGE_LENGTH } from "@/lib/settings";
import { chatTexts, errorTexts } from "@/lib/texts";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  waitlistSize: string | null;
  createdAt: string;
};

type Props = {
  source: "site" | "widget" | "owner";
  // localStorage key for the chat id; null keeps it in memory only (owner test chat).
  storageKey: string | null;
  compact?: boolean;
  header?: ReactNode;
  onSent?: () => void;
};

function readStorage(key: string | null): string | null {
  if (!key) return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string | null, value: string | null) {
  if (!key) return;
  try {
    if (value) window.localStorage.setItem(key, value);
    else window.localStorage.removeItem(key);
  } catch {
    // Storage can be blocked (private mode, third-party iframe). The chat still works for this page view.
  }
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("et-EE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Tallinn" });
}

const LINK = /(https?:\/\/[^\s)]+|[\w.+-]+@[\w-]+\.[\w.-]+[a-z])/gi;

function Linkified({ text }: { text: string }) {
  const parts = text.split(LINK);
  return (
    <>
      {parts.map((part, i) => {
        if (i % 2 === 0) return <Fragment key={i}>{part}</Fragment>;
        const href = part.includes("@") && !part.startsWith("http") ? `mailto:${part}` : part;
        return (
          <a key={i} href={href} target="_blank" rel="noopener noreferrer" className="break-all text-ember underline underline-offset-2">
            {part}
          </a>
        );
      })}
    </>
  );
}

export function Chat({ source, storageKey, compact = false, header, onSent }: Props) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Continue the saved chat after a reload.
  useEffect(() => {
    const saved = readStorage(storageKey);
    if (!saved) return;
    let cancelled = false;
    fetch(`/api/chat?sessionId=${encodeURIComponent(saved)}`)
      .then((r) => (r.ok ? r.json() : { messages: [] }))
      .then((data: { messages: ChatMessage[] }) => {
        if (cancelled) return;
        if (data.messages.length > 0) {
          setSessionId(saved);
          setMessages(data.messages);
        } else {
          writeStorage(storageKey, null);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [storageKey]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  // Grow the text area with its content, up to a limit.
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || sending) return;
      if (text.length > MAX_MESSAGE_LENGTH) {
        setError(errorTexts.tooLong);
        return;
      }
      setError(null);
      setSending(true);
      setInput("");
      const tempId = `temp-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        { id: tempId, role: "user", content: text, waitlistSize: null, createdAt: new Date().toISOString() },
      ]);

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, message: text, source }),
        });
        const data = await response.json().catch(() => ({}));
        if (data.sessionId) {
          setSessionId(data.sessionId);
          writeStorage(storageKey, data.sessionId);
        }
        if (!response.ok) {
          // With a sessionId the message was saved and only the answer failed; otherwise give the text back.
          if (!data.sessionId) {
            setMessages((prev) => prev.filter((m) => m.id !== tempId));
            setInput(text);
          }
          setError(typeof data.error === "string" ? data.error : errorTexts.connection);
          return;
        }
        setMessages((prev) => [...prev.filter((m) => m.id !== tempId), data.user, data.reply]);
        onSent?.();
      } catch {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        setInput(text);
        setError(errorTexts.connection);
      } finally {
        setSending(false);
        inputRef.current?.focus();
      }
    },
    [sending, sessionId, source, storageKey, onSent],
  );

  function restart() {
    setMessages([]);
    setSessionId(null);
    setError(null);
    writeStorage(storageKey, null);
    inputRef.current?.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void send(input);
    }
  }

  const hasUserMessages = messages.some((m) => m.role === "user");
  const tooLong = input.trim().length > MAX_MESSAGE_LENGTH;
  const waitlistTarget = source === "widget" ? "_top" : "_blank";

  return (
    <div className="flex h-full min-h-0 flex-col">
      {header}

      <div
        ref={scrollRef}
        className={cn("flex-1 space-y-4 overflow-y-auto", compact ? "px-3 py-4" : "px-4 py-6")}
        aria-live="polite"
        aria-busy={sending}
      >
        <Bubble role="assistant">{chatTexts.greeting}</Bubble>

        {!hasUserMessages && (
          <div className="flex flex-wrap gap-2 pl-1">
            {chatTexts.chips.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => void send(chip)}
                disabled={sending}
                className="min-h-11 rounded-full border border-ember/40 bg-card px-4 text-sm text-ember transition-colors hover:bg-ember hover:text-primary-foreground disabled:opacity-50"
              >
                {chip}
              </button>
            ))}
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className="space-y-2">
            <Bubble role={m.role} time={formatTime(m.createdAt)}>
              {m.role === "assistant" ? <Linkified text={m.content} /> : m.content}
            </Bubble>
            {m.role === "assistant" && m.waitlistSize && (
              <a
                href={`https://kaskia.ee/ootenimekiri?suurus=${m.waitlistSize === "0,33" ? "0,33" : "0,5"}`}
                target={waitlistTarget}
                rel="noopener"
                className="ml-1 inline-flex min-h-11 items-center rounded-full bg-ember px-5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                {chatTexts.waitlist(m.waitlistSize)}
              </a>
            )}
          </div>
        ))}

        {sending && <p className="pl-1 text-sm text-muted-foreground">{chatTexts.typing}</p>}
      </div>

      <form
        className={cn("border-t border-border bg-background", compact ? "px-3 pt-3 pb-2" : "px-4 pt-3 pb-3")}
        onSubmit={(event) => {
          event.preventDefault();
          void send(input);
        }}
      >
        {error && (
          <p role="alert" className="mb-2 text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="flex items-end gap-2 rounded-2xl border border-input bg-card p-1.5 focus-within:border-ember">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder={chatTexts.placeholder}
            rows={1}
            aria-label={chatTexts.placeholder}
            className="max-h-40 min-h-11 flex-1 resize-none bg-transparent px-2.5 py-2.5 text-base leading-6 outline-none placeholder:text-muted-foreground"
          />
          <Button
            type="submit"
            disabled={sending || !input.trim() || tooLong}
            className="h-11 shrink-0 rounded-xl px-4 text-[15px]"
          >
            {chatTexts.send}
            <ArrowUp aria-hidden />
          </Button>
        </div>
        <div className="mt-2 flex items-start justify-between gap-3">
          <p className="text-xs leading-5 text-muted-foreground">{chatTexts.note}</p>
          <div className="flex shrink-0 items-center gap-2">
            {input.length > MAX_MESSAGE_LENGTH - 100 && (
              <span className={cn("text-xs tabular-nums", tooLong ? "text-destructive" : "text-muted-foreground")}>
                {input.trim().length}/{MAX_MESSAGE_LENGTH}
              </span>
            )}
            {messages.length > 0 && (
              <Button type="button" variant="ghost" onClick={restart} className="h-11 px-3 text-sm text-muted-foreground">
                <RotateCcw aria-hidden />
                {chatTexts.restart}
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}

function Bubble({ role, time, children }: { role: "user" | "assistant"; time?: string; children: ReactNode }) {
  const mine = role === "user";
  return (
    <div className={cn("flex flex-col", mine ? "items-end" : "items-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-2.5 text-[15px] leading-6 whitespace-pre-wrap break-words",
          mine ? "rounded-br-md bg-ember text-primary-foreground" : "rounded-bl-md border border-border bg-card text-foreground",
        )}
      >
        {children}
      </div>
      {time && <span className="mt-1 px-1 text-[11px] text-muted-foreground">{time}</span>}
    </div>
  );
}
