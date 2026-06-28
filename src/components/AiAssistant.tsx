import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
  thinking?: string;
}

const NVIDIA_ENDPOINT = "https://integrate.api.nvidia.com/v1/chat/completions";
const NVIDIA_API_KEY = import.meta.env.VITE_NVIDIA_API_KEY as string;
const MODEL = "google/diffusiongemma-26b-a4b-it";

const SYSTEM_PROMPT = `You are an AI assistant for the IOCL Vashi LBP Grease Plant Routing System.
You help plant operators with:
- Product group compatibility and routing decisions
- Equipment selection and cleaning requirements
- Understanding batch stages (Reactor → Kettle → Homogeniser → Filling Point)
- Dye/colour product handling and flush requirements
- Borderline compatibility situations and QC consultation
- General grease manufacturing process guidance

Key rules:
- 25 product groups (G01–G25) based on thickener type and colour
- Compatibility: SAME/COMPATIBLE = no clean, BORDERLINE = QC consult required, INCOMPATIBLE = must clean kettle
- Dye products require DYE_FLUSH on kettle, homogeniser, and filling point after batch
- Synthetic/polyurea greases need dedicated equipment
- Food grade greases need exclusive facility free from mineral oils
- Kettle wash from incompatible changeover: collect in barrel, use for Servo Grease C or consult QC

Be concise and practical. This is a plant control room assistant.`;

async function callNvidiaStream(
  messages: Message[],
  onToken: (token: string) => void,
  onThink: (token: string) => void
): Promise<void> {
  const response = await fetch(NVIDIA_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${NVIDIA_API_KEY}`,
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "user", content: SYSTEM_PROMPT },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ],
      max_tokens: 4096,
      temperature: 1.0,
      top_p: 0.95,
      stream: true,
      chat_template_kwargs: { enable_thinking: true },
    }),
  });

  if (!response.ok) {
    const err = await response.text().catch(() => `HTTP ${response.status}`);
    throw new Error(`NVIDIA API error ${response.status}: ${err.slice(0, 200)}`);
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
        const delta = parsed.choices?.[0]?.delta?.content ?? "";
        if (!delta) continue;

        // Track <think>...</think> blocks and route separately
        let remaining = delta;
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
      await callNvidiaStream(
        allMessages,
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
          content: `⚠ NVIDIA API error: ${e.message}`,
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
                diffusiongemma-26b-a4b-it
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
