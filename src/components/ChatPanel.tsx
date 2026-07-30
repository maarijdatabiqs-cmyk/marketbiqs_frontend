"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button, Input, Textarea } from "@/components/ui";
import { ChatMessage, streamChat } from "@/lib/api";

type ChatPanelProps = {
  clientId: string;
  messages: ChatMessage[];
  onMessagesChange: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  emptyHint?: string;
  placeholder?: string;
  variant?: "input" | "textarea";
  className?: string;
  listClassName?: string;
};

const markdownComponents: Components = {
  h1: ({ children }) => <h3 className="mt-3 mb-1.5 text-base font-semibold first:mt-0">{children}</h3>,
  h2: ({ children }) => <h3 className="mt-3 mb-1.5 text-base font-semibold first:mt-0">{children}</h3>,
  h3: ({ children }) => <h4 className="mt-2.5 mb-1 text-sm font-semibold first:mt-0">{children}</h4>,
  p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
  ul: ({ children }) => <ul className="mb-2 list-disc space-y-1 pl-4 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="mb-2 list-decimal space-y-1 pl-4 last:mb-0">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  a: ({ href, children }) => (
    <a href={href} className="underline underline-offset-2" target="_blank" rel="noreferrer">
      {children}
    </a>
  ),
  code: ({ children }) => <code className="rounded bg-black/5 px-1 py-0.5 text-[0.85em]">{children}</code>,
};

function MessageBubble({ message, streaming }: { message: ChatMessage; streaming?: boolean }) {
  const isUser = message.role === "user";
  return (
    <div
      className={`max-w-[92%] sm:max-w-[88%] rounded-2xl px-3.5 py-2.5 sm:px-4 sm:py-3 text-sm break-words ${
        isUser ? "ml-auto bg-[var(--accent)] text-white" : "bg-[var(--accent-soft)] text-[var(--ink)]"
      }`}
    >
      {isUser ? (
        <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
      ) : (
        <div className="chat-md">
          {message.content ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {message.content}
            </ReactMarkdown>
          ) : streaming ? (
            <span className="inline-flex items-center gap-1 text-[var(--muted)]">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--accent)]" />
              Thinking…
            </span>
          ) : null}
          {streaming && message.content ? (
            <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse rounded-sm bg-[var(--accent)] align-middle" />
          ) : null}
        </div>
      )}
    </div>
  );
}

export function ChatPanel({
  clientId,
  messages,
  onMessagesChange,
  emptyHint = "No messages yet. Ask about competitors, trends, or sentiment.",
  placeholder = "Ask about competitor changes, trends, or sentiment...",
  variant = "input",
  className = "",
  listClassName = "",
}: ChatPanelProps) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingId]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  async function onSend(e: FormEvent) {
    e.preventDefault();
    if (!clientId || !input.trim() || loading) return;

    const text = input.trim();
    setInput("");
    setError("");
    setLoading(true);

    const tempUserId = `local-user-${Date.now()}`;
    const tempAssistantId = `local-assistant-${Date.now()}`;
    onMessagesChange((prev) => [
      ...prev,
      { id: tempUserId, role: "user", content: text, pending: true },
      { id: tempAssistantId, role: "assistant", content: "", pending: true },
    ]);
    setStreamingId(tempAssistantId);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await streamChat(clientId, text, {
        signal: controller.signal,
        onUser: (message) => {
          onMessagesChange((prev) =>
            prev.map((m) => (m.id === tempUserId ? { ...message, pending: false } : m)),
          );
        },
        onDelta: (delta) => {
          onMessagesChange((prev) =>
            prev.map((m) =>
              m.id === tempAssistantId || (m.pending && m.role === "assistant")
                ? { ...m, content: `${m.content || ""}${delta}` }
                : m,
            ),
          );
        },
        onDone: (message) => {
          onMessagesChange((prev) =>
            prev.map((m) =>
              m.id === tempAssistantId || (m.pending && m.role === "assistant")
                ? { ...message, pending: false }
                : m,
            ),
          );
          setStreamingId(null);
        },
        onError: (detail) => setError(detail),
      });
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      const detail = err instanceof Error ? err.message : "Chat failed";
      setError(detail);
      onMessagesChange((prev) => {
        const withoutTemps = prev.filter((m) => m.id !== tempUserId && m.id !== tempAssistantId);
        return [
          ...withoutTemps,
          { id: tempUserId, role: "user", content: text },
          {
            id: tempAssistantId,
            role: "assistant",
            content: `Sorry — I couldn’t finish that reply.\n\n**What happened:** ${detail}\n\nTry again in a moment.`,
          },
        ];
      });
      setStreamingId(null);
    } finally {
      setLoading(false);
      setStreamingId(null);
    }
  }

  return (
    <div className={`flex min-h-[320px] sm:min-h-[420px] flex-col ${className}`}>
      {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}
      <div className={`mb-4 flex-1 space-y-3 overflow-auto ${listClassName}`}>
        {messages.map((m) => (
          <MessageBubble
            key={m.id}
            message={m}
            streaming={Boolean(streamingId && (m.id === streamingId || (m.pending && m.role === "assistant")))}
          />
        ))}
        {messages.length === 0 ? <p className="text-sm text-[var(--muted)]">{emptyHint}</p> : null}
        <div ref={bottomRef} />
      </div>
      <form
        onSubmit={onSend}
        className={variant === "textarea" ? "space-y-2" : "flex flex-col sm:flex-row gap-2"}
      >
        {variant === "textarea" ? (
          <Textarea
            rows={3}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholder}
            disabled={loading}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void onSend(e as unknown as FormEvent);
              }
            }}
          />
        ) : (
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholder}
            disabled={loading}
          />
        )}
        <Button type="submit" className="w-full sm:w-auto" disabled={loading || !input.trim()}>
          {loading ? "Streaming…" : "Send"}
        </Button>
      </form>
    </div>
  );
}
