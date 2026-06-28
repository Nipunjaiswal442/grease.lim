import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const DEFAULT_URL = "http://localhost:1234";

const SYSTEM_PROMPT = `You are an AI assistant for the IOCL Vashi LBP Grease Plant Routing System.
You help plant operators with:
- Product group compatibility and routing decisions
- Equipment selection and cleaning requirements
- Understanding batch stages (Reactor → Kettle → Homogeniser → Filling Point)
- Dye/colour product handling and flush requirements
- Borderline compatibility situations and QC consultation
- General grease manufacturing process guidance

Key rules:
- 25 product groups (G01-G25) based on thickener type and colour
- Compatibility: SAME/COMPATIBLE = no clean, BORDERLINE = QC consult required, INCOMPATIBLE = must clean kettle
- Dye products require DYE_FLUSH on kettle, homogeniser, and filling point after batch
- Synthetic/polyurea greases need dedicated equipment
- Food grade greases need exclusive facility free from mineral oils
- Kettle wash from incompatible changeover: collect in barrel, use for Servo Grease C or consult QC

Be concise and practical. This is a plant control room assistant.`;

export default function AiAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [lmUrl, setLmUrl] = useState(DEFAULT_URL);
  const [showUrl, setShowUrl] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Message = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch(`${lmUrl.replace(/\/$/, "")}/v1/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gemma-4",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...messages,
            userMsg,
          ],
          temperature: 0.3,
          max_tokens: 512,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`LM Studio returned ${response.status}`);
      }

      const data = await response.json();
      const aiContent = data.choices?.[0]?.message?.content ?? "No response";
      setMessages((prev) => [...prev, { role: "assistant", content: aiContent }]);
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `⚠ Could not reach LM Studio at ${lmUrl}\n\nMake sure LM Studio is running with the Gemma 4 model loaded and the local server is active on port 1234.\n\nError: ${e.message}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button className="ai-fab" onClick={() => setOpen((o) => !o)} title="AI Assistant (Gemma 4)">
        🤖
      </button>

      {open && (
        <div className="ai-panel">
          <div className="ai-header">
            <div className="ai-title">⚙ Gemma 4 Assistant</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => setShowUrl((s) => !s)}
                style={{ fontSize: "0.58rem", padding: "2px 6px" }}
              >
                {showUrl ? "▲" : "⚙"}
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

          {showUrl && (
            <div className="ai-url-row">
              <span className="ai-url-label">LM Studio URL:</span>
              <input
                className="ai-url-input"
                value={lmUrl}
                onChange={(e) => setLmUrl(e.target.value)}
                placeholder="http://localhost:1234"
              />
            </div>
          )}

          <div className="ai-messages">
            {messages.length === 0 && (
              <div style={{ color: "var(--text-dim)", fontSize: "0.72rem", textAlign: "center", padding: "20px 0" }}>
                Ask about compatibility, routing, or equipment decisions.
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`ai-msg-${m.role}`}>
                {m.content}
              </div>
            ))}
            {loading && (
              <div className="ai-msg-ai" style={{ color: "var(--text-dim)" }}>
                Thinking...
              </div>
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
