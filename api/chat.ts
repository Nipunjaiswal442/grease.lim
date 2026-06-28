type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type ServerRequest = {
  method?: string;
  on(event: "data", listener: (chunk: unknown) => void): void;
  on(event: "end", listener: () => void): void;
  on(event: "error", listener: (error: unknown) => void): void;
};

type ServerResponse = {
  writeHead(statusCode: number, headers?: Record<string, string>): void;
  write(chunk: Uint8Array | string): void;
  end(chunk?: string): void;
};

declare const process: {
  env: Record<string, string | undefined>;
};

const NVIDIA_ENDPOINT = "https://integrate.api.nvidia.com/v1/chat/completions";
const MODEL = "google/diffusiongemma-26b-a4b-it";
const SYSTEM_PROMPT = `You are an AI assistant for the IOCL Vashi LBP Grease Plant Routing System.
You help plant operators with:
- Product group compatibility and routing decisions
- Equipment selection and cleaning requirements
- Understanding batch stages (Reactor -> Kettle -> Homogeniser -> Filling Point)
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

function readBody(req: ServerRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += typeof chunk === "string"
        ? chunk
        : (chunk as { toString: (encoding?: string) => string }).toString("utf8");
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function sendJson(res: ServerResponse, statusCode: number, body: unknown) {
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

export default async function handler(req: ServerRequest, res: ServerResponse) {
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.NVIDIA_API_KEY ?? process.env.VITE_NVIDIA_API_KEY;
  if (!apiKey) {
    sendJson(res, 500, { error: "NVIDIA_API_KEY is not configured on the server." });
    return;
  }

  let messages: ChatMessage[];
  try {
    const parsed = JSON.parse(await readBody(req)) as { messages?: ChatMessage[] };
    messages = Array.isArray(parsed.messages) ? parsed.messages : [];
  } catch {
    sendJson(res, 400, { error: "Invalid JSON request body." });
    return;
  }

  let upstream: Response;
  try {
    upstream = await fetch(NVIDIA_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
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
  } catch (error) {
    const message = error instanceof Error ? error.message : "NVIDIA request failed.";
    sendJson(res, 502, { error: message });
    return;
  }

  if (!upstream.ok || !upstream.body) {
    const errorText = await upstream.text().catch(() => `HTTP ${upstream.status}`);
    sendJson(res, upstream.status || 502, {
      error: `NVIDIA API error ${upstream.status}: ${errorText.slice(0, 240)}`,
    });
    return;
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  const reader = upstream.body.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    res.write(value);
  }
  res.end();
}
