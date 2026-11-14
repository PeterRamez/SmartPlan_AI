import { env } from "@/lib/env";

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function textFromContent(value: unknown): string | null {
  if (typeof value === "string") return value.trim() || null;
  if (Array.isArray(value)) {
    const parts = value
      .map((part) => {
        if (typeof part === "string") return part;
        if (!isRecord(part)) return "";
        return typeof part.text === "string" ? part.text : "";
      })
      .filter(Boolean);
    const joined = parts.join("\n").trim();
    return joined || null;
  }
  return null;
}

function extractCloudflareText(payload: unknown): string | null {
  if (!isRecord(payload)) return null;
  const result = isRecord(payload.result) ? payload.result : payload;

  // Workers AI model-specific response shape.
  const direct = textFromContent(result.response) ?? textFromContent(result.output_text);
  if (direct) return direct;

  // OpenAI-compatible chat-completion response shape used by newer models.
  if (Array.isArray(result.choices)) {
    for (const choice of result.choices) {
      if (!isRecord(choice)) continue;
      const message = isRecord(choice.message) ? choice.message : null;
      const messageText = message ? textFromContent(message.content) : null;
      if (messageText) return messageText;
      const delta = isRecord(choice.delta) ? textFromContent(choice.delta.content) : null;
      if (delta) return delta;
      const choiceText = textFromContent(choice.text);
      if (choiceText) return choiceText;
    }
  }

  return null;
}

export async function generateText(system: string, user: string): Promise<string> {
  if (env.AI_PROVIDER === "ollama") {
    const response = await fetch(`${env.OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: env.OLLAMA_LLM_MODEL,
        stream: false,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user }
        ]
      })
    });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Ollama generation failed (${response.status}): ${detail.slice(0, 500)}`);
    }
    const data: unknown = await response.json();
    const answer = isRecord(data) && isRecord(data.message)
      ? textFromContent(data.message.content)
      : null;
    if (!answer) throw new Error("Ollama returned an empty response");
    return answer;
  }

  if (!env.CLOUDFLARE_ACCOUNT_ID || !env.CLOUDFLARE_API_TOKEN) {
    throw new Error("Cloudflare AI credentials missing");
  }

  const url = `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/ai/run/${env.LLM_MODEL}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ],
      // GLM-4.7 supports this option; disabling internal reasoning requests a direct user-facing answer.
      chat_template_kwargs: { enable_thinking: false },
      max_completion_tokens: 2048,
      temperature: 0.2
    })
  });

  const raw = await response.text();
  if (!response.ok) {
    throw new Error(`Cloudflare Workers AI failed (${response.status}): ${raw.slice(0, 700) || response.statusText}`);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    throw new Error(`Cloudflare Workers AI returned non-JSON output (HTTP ${response.status}): ${raw.slice(0, 300) || "empty body"}`);
  }

  const answer = extractCloudflareText(payload);
  if (!answer) {
    const rootKeys = isRecord(payload) ? Object.keys(payload).join(", ") : typeof payload;
    const result = isRecord(payload) && isRecord(payload.result) ? payload.result : null;
    const resultKeys = result ? Object.keys(result).join(", ") : "none";
    throw new Error(`Cloudflare GLM response contained no text. Root keys: ${rootKeys || "none"}; result keys: ${resultKeys}. Check the Vercel Function Logs for the request details.`);
  }

  return answer;
}
