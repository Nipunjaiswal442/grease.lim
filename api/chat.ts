type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type PlantContext = {
  groups?: Array<{ groupCode: string; code: number; name: string; colour?: string; thickener?: string }>;
  equipment?: Array<{
    equipmentId: string;
    displayName: string;
    type: string;
    capacityT?: number;
    status: string;
    lastGroupCode?: string;
    lastBatchId?: string;
  }>;
  activeBatches?: Array<{
    batchId: string;
    gradeId: string;
    gradeName?: string;
    groupCode: string;
    stage: string;
    reactorId?: string;
    kettleId?: string;
    homogeniserId?: string;
    fillingPointId?: string;
  }>;
  recentBatches?: Array<{ batchId: string; gradeId: string; groupCode: string; stage: string }>;
  recentGrades?: Array<{
    gradeId: string;
    name: string;
    groupCode: string;
    hasDye: boolean;
    isBituminous: boolean;
    isSynthetic: boolean;
    isFoodGrade: boolean;
  }>;
  compatibilitySummary?: Record<string, number>;
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
const BASE_SYSTEM_PROMPT = `You are an AI assistant for the IOCL Vashi LBP Grease Plant Routing System.
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

function fmtList<T>(items: T[] | undefined, render: (item: T) => string, fallback = "None") {
  if (!items?.length) return fallback;
  return items.map(render).join("\n");
}

function buildSystemPrompt(ctx?: PlantContext) {
  const equipment = ctx?.equipment ?? [];
  const byType = (type: string) => equipment.filter((eq) => eq.type === type);
  const equipmentLine = (eq: NonNullable<PlantContext["equipment"]>[number]) =>
    `- ${eq.equipmentId} ${eq.displayName}: ${eq.status}${eq.capacityT ? `, ${eq.capacityT}t` : ""}${eq.lastGroupCode ? `, last ${eq.lastGroupCode}` : ""}${eq.lastBatchId ? `, batch ${eq.lastBatchId}` : ""}`;

  const activeBatches = fmtList(ctx?.activeBatches, (batch) =>
    `- ${batch.batchId}: ${batch.gradeId}${batch.gradeName ? ` ${batch.gradeName}` : ""}, ${batch.groupCode}, stage ${batch.stage}, route ${batch.reactorId ?? "?"} > ${batch.kettleId ?? "?"} > ${batch.homogeniserId ?? "?"} > ${batch.fillingPointId ?? "?"}`
  );

  const groups = fmtList(ctx?.groups, (group) =>
    `- ${group.groupCode}: ${group.name}${group.colour ? ` [${group.colour}]` : ""}${group.thickener ? `, ${group.thickener}` : ""}`
  );

  const gradeLines = fmtList(ctx?.recentGrades, (grade) => {
    const flags = [
      grade.hasDye ? "DYE" : "",
      grade.isBituminous ? "BITUMINOUS" : "",
      grade.isSynthetic ? "SYNTHETIC" : "",
      grade.isFoodGrade ? "FOOD" : "",
    ].filter(Boolean);
    return `- ${grade.gradeId}: ${grade.name}, ${grade.groupCode}${flags.length ? ` (${flags.join(", ")})` : ""}`;
  });

  const counts = ctx?.compatibilitySummary;
  const compatCounts = counts
    ? Object.entries(counts).map(([relation, count]) => `${relation}: ${count}`).join(", ")
    : "Matrix summary unavailable";

  return `${BASE_SYSTEM_PROMPT}

Live plant context:

Reactors:
${fmtList(byType("REACTOR"), equipmentLine)}

Kettles:
${fmtList(byType("KETTLE"), equipmentLine)}

Homogenisers:
${fmtList(byType("HOMOGENISER"), equipmentLine)}

Filling points:
${fmtList(byType("FILLING_POINT"), equipmentLine)}

Active batches:
${activeBatches}

Product groups:
${groups}

Known active/recent grades:
${gradeLines}

Compatibility matrix counts:
${compatCounts}

Rules for answers:
- You are read-only. Do not claim to start batches, change status, edit matrix cells, or delete data.
- Cite exact grade codes, group codes, equipment IDs, and batch IDs when relevant.
- If the local context is insufficient for a specific grade or cell, say that and tell the operator where to check.`;
}

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
  let plantContext: PlantContext | undefined;
  try {
    const parsed = JSON.parse(await readBody(req)) as { messages?: ChatMessage[]; plantContext?: PlantContext };
    messages = Array.isArray(parsed.messages) ? parsed.messages : [];
    plantContext = parsed.plantContext;
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
          { role: "user", content: buildSystemPrompt(plantContext) },
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
