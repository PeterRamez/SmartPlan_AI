import { env } from "@/lib/env";
export async function embedText(text: string): Promise<number[]> {
  let data: any;
  if (env.EMBEDDING_PROVIDER === "ollama") {
    const response = await fetch(`${env.OLLAMA_BASE_URL}/api/embed`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ model: env.OLLAMA_EMBEDDING_MODEL, input: text })
    });
    if (!response.ok) throw new Error(`Ollama embedding failed: ${response.status}`);
    data = await response.json();
    const vector = data.embeddings?.[0];
    if (!Array.isArray(vector)) throw new Error("Embedding response missing vector");
    if (vector.length !== 1024) throw new Error(`Expected 1024 dimensions for BGE-M3, received ${vector.length}. Update schema only after deliberate migration.`);
    return vector;
  }
  if (!env.CUSTOM_EMBEDDING_URL) throw new Error("CUSTOM_EMBEDDING_URL is required for custom embeddings");
  const response = await fetch(env.CUSTOM_EMBEDDING_URL, {
    method: "POST", headers: { "content-type": "application/json", ...(env.CUSTOM_EMBEDDING_API_KEY ? { Authorization: `Bearer ${env.CUSTOM_EMBEDDING_API_KEY}` } : {}) },
    body: JSON.stringify({ input: text, model: "bge-m3" })
  });
  if (!response.ok) throw new Error(`Custom embedding endpoint failed: ${response.status}`);
  data = await response.json();
  const vector = data.embedding ?? data.data?.[0]?.embedding;
  if (!Array.isArray(vector) || vector.length !== 1024) throw new Error("Custom embedding must return a 1024-dimensional BGE-M3 vector");
  return vector;
}
