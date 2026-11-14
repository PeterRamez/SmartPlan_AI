import { env } from "@/lib/env";

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
    if (!response.ok) throw new Error(`Ollama generation failed: ${response.status}`);
    const data = await response.json();
    return data.message?.content ?? "";
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
      ]
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Cloudflare Workers AI failed (${response.status}): ${detail.slice(0, 500)}`);
  }

  const payload: unknown = await response.json();
  if (typeof payload !== "object" || payload === null || !("result" in payload)) {
    throw new Error("Cloudflare Workers AI returned an unexpected response");
  }
  const result = (payload as { result?: { response?: unknown; output_text?: unknown } }).result;
  const answer = result?.response ?? result?.output_text;
  if (typeof answer !== "string" || !answer.trim()) {
    throw new Error("Cloudflare GLM returned an empty or unsupported response");
  }
  return answer;
}
