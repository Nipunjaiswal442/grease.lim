import { useState, useRef, useEffect } from "react";
import { usePlantStore } from "../data/plantContext";

interface Message {
  role: "user" | "assistant";
  content: string;
  thinking?: string;
}

const MODEL = "google/diffusiongemma-26b-a4b-it";

async function callNvidiaStream(
  messages: Message[],
  plantContext: unknown,
  onToken: (token: string) => void,
  onThink: (token: string) => void
): Promise<void> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify({
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      plantContext,
    }),
  });

  if (!response.ok) {
    const err = await response.text().catch(() => `HTTP ${response.status}`);
    let serverError: string | undefined;
    try {
      const parsed = JSON.parse(err) as { error?: string };
      serverError = parsed.error;
    } catch {
      serverError = undefined;
    }
    throw new Error(serverError ?? `AI service error ${response.status}: ${err.slice(0, 200)}`);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let inThinking = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const data = trimmed.slice(5).trim();
      if (data === "[DONE]") return;
      try {
        const parsed = JSON.parse(data);
        const delta = parsed.choices?.[0]?.delta ?? {};
        const reasoning = delta.reasoning ?? "";
        const content = delta.content ?? "";
        if (reasoning) onThink(reasoning);
        if (!content) continue;

        // Track <think>...</think> blocks and route separately
        let remaining = content;
        while (remaining) {
          if (inThinking) {
            const end = remaining.indexOf("</think>");
            if (end === -1) {
              onThink(remaining);
              remaining = "";
            } else {
              onThink(remaining.slice(0, end));
              inThinking = false;
              remaining = remaining.slice(end + 8);
            }
          } else {
            const start = remaining.indexOf("<think>");
            if (start === -1) {
              onToken(remaining);
              remaining = "";
            } else {
              if (start > 0) onToken(remaining.slice(0, start));
              inThinking = true;
              remaining = remaining.slice(start + 7);
            }
          }
        }
      } catch {
        // skip malformed SSE lines
      }
    }
  }
}

export default function AiAssistant() {
  const { groups, grades, equipment, batches, compatibilityMatrix } = usePlantStore();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showThinking, setShowThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Message = { role: "user", content: input.trim() };
    const allMessages = [...messages, userMsg];
    setMessages([...allMessages, { role: "assistant", content: "", thinking: "" }]);
    setInput("");
    setLoading(true);

    try {
      const activeBatches = batches.filter((batch) => batch.stage !== "complete");
      const recentGrades = grades.filter((grade) => grade.isActive !== false).slice(0, 60);
      const relationCounts = Object.values(compatibilityMatrix.matrix).reduce(
        (counts, row) => {
          for (const relation of Object.values(row)) counts[relation] = (counts[relation] ?? 0) + 1;
          return counts;
        },
        {} as Record<string, number>
      );
      await callNvidiaStream(
        allMessages,
        {
          groups,
          equipment,
          activeBatches,
          recentBatches: batches.slice(0, 20),
          recentGrades,
          compatibilitySummary: relationCounts,
        },
        (token) => {
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            updated[updated.length - 1] = { ...last, content: last.content + token };
            return updated;
          });
        },
        (token) => {
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            updated[updated.length - 1] = {
              ...last,
              thinking: (last.thinking ?? "") + token,
            };
            return updated;
          });
        }
      );
    } catch (e: any) {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: `AI assistant error: ${e.message}`,
        };
        return updated;
      });
    } finally {
      setLoading(false);
    }
  };

  const lastMsg = messages[messages.length - 1];
  const isStreaming = loading && lastMsg?.role === "assistant";

  return (
    <>
      <button className="ai-fab" onClick={() => setOpen((o) => !o)} title="Gemma 4 AI Assistant (NVIDIA)">
        🤖
      </button>

      {open && (
        <div className="ai-panel">
          <div className="ai-header">
            <div>
              <div className="ai-title">Gemma 4 · NVIDIA</div>
              <div style={{ fontSize: "0.55rem", color: "var(--text-dim)", marginTop: 1 }}>
                {MODEL}
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => setShowThinking((s) => !s)}
                title="Toggle thinking trace"
                style={{ fontSize: "0.58rem", padding: "2px 7px" }}
              >
                {showThinking ? "💭" : "💭"}
              </button>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => setMessages([])}
                title="Clear chat"
                style={{ fontSize: "0.58rem", padding: "2px 6px" }}
              >
                ✕✕
              </button>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => setOpen(false)}
                style={{ fontSize: "0.7rem", padding: "2px 6px" }}
              >
                ✕
              </button>
            </div>
          </div>

          <div className="ai-messages">
            {messages.length === 0 && (
              <div style={{ color: "var(--text-dim)", fontSize: "0.72rem", textAlign: "center", padding: "20px 0" }}>
                Ask about compatibility, routing, or equipment decisions.
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i}>
                {m.role === "assistant" && showThinking && m.thinking && (
                  <div
                    style={{
                      fontSize: "0.65rem",
                      color: "var(--text-dim)",
                      background: "rgba(59,130,246,0.05)",
                      border: "1px solid rgba(59,130,246,0.15)",
                      borderRadius: 2,
                      padding: "4px 8px",
                      marginBottom: 4,
                      whiteSpace: "pre-wrap",
                      fontStyle: "italic",
                    }}
                  >
                    💭 {m.thinking}
                  </div>
                )}
                <div className={`ai-msg-${m.role}`}>
                  {m.content || (isStreaming && i === messages.length - 1 ? "▋" : "")}
                </div>
              </div>
            ))}
            {loading && !isStreaming && (
              <div className="ai-msg-ai" style={{ color: "var(--text-dim)" }}>▋</div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="ai-input-row">
            <input
              className="input"
              style={{ fontSize: "0.78rem", padding: "6px 10px" }}
              placeholder="Ask about routing, compatibility..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
              disabled={loading}
            />
            <button
              className="btn btn-primary btn-sm"
              onClick={sendMessage}
              disabled={loading || !input.trim()}
            >
              →
            </button>
          </div>
        </div>
      )}
    </>
  );
}
