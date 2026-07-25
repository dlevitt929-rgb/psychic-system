"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const SUGGESTIONS = ["Should I sell my worst defender?", "Is a -4 worth taking this week?", "Who should I captain?", "Should I wildcard?"];

interface Message {
  role: "user" | "assistant";
  text: string;
  groundedOn?: string[];
}

export function ChatWindow({ teamId }: { teamId: string }) {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", text: "I know your squad, bank, and mini-league rivals — ask me anything about your team this gameweek." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function send(question: string) {
    if (!question.trim() || loading) return;
    setMessages((m) => [...m, { role: "user", text: question }]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question, teamId }),
      });
      const data = await res.json();
      setMessages((m) => [...m, { role: "assistant", text: data.answer ?? "Something went wrong.", groundedOn: data.groundedOn }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", text: "Couldn't reach the assistant — try again." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-[560px] rounded-2xl border [border-color:var(--border)] [background:var(--surface)] overflow-hidden">
      <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={cn("max-w-[85%] rounded-2xl px-4 py-2.5 text-sm animate-fade-in-up", m.role === "user" ? "ml-auto [background:var(--accent)] text-white" : "[background:var(--surface-hover)]")}>
            <p>{m.text}</p>
            {m.groundedOn && m.groundedOn.length > 0 && (
              <p className="mt-1.5 text-[10px] opacity-70">Based on: {m.groundedOn.join(" · ")}</p>
            )}
          </div>
        ))}
        {loading && <div className="text-xs [color:var(--text-muted)] animate-pulse-soft">Thinking…</div>}
      </div>
      <div className="border-t [border-color:var(--border)] p-3">
        <div className="flex gap-2 flex-wrap mb-2">
          {SUGGESTIONS.map((s) => (
            <button key={s} onClick={() => send(s)} className="text-xs px-2.5 py-1 rounded-full border [border-color:var(--border)] [color:var(--text-muted)] hover:[color:var(--text)]">
              {s}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your team…"
            className="flex-1 rounded-lg border px-3 py-2 text-sm [border-color:var(--border)] [background:var(--bg-elevated)]"
          />
          <button type="submit" className="rounded-lg px-4 py-2 text-sm font-semibold [background:var(--accent)] text-white">
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
