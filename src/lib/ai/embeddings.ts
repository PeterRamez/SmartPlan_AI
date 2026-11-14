import { env } from "@/lib/env";

interface OllamaEmbeddingResponse {
  embeddings?: unknown;
}

interface CustomEmbeddingResponse {
  embedding?: unknown;
  data?: Array<{ embedding?: unknown }>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNumberVector(value: unknown): value is number[] {
  return (
    Array.isArray(value) &&
    value.every((item): item is number => typeof item === "number" && Number.isFinite(item))
  );
}

function validateVector(value: unknown, provider: string): number[] {
  if (!isNumberVector(value)) {
    throw new Error(`${provider} embedding response is missing a valid numeric vector`);
  }
  if (value.length !== 1024) {
    throw new Error(
      `Expected 1024 dimensions for BGE-M3, received ${value.length}. Update schema only after deliberate migration.`
    );
  }
  return value;
}

export async function embedText(text: string): Promise<number[]> {
  if (env.EMBEDDING_PROVIDER === "ollama") {
    const response = await fetch(`${env.OLLAMA_BASE_URL}/api/embed`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model: env.OLLAMA_EMBEDDING_MODEL, input: text })
    });

    if (!response.ok) {
      throw new Error(`Ollama embedding failed: ${response.status}`);
    }

    const data: unknown = await response.json();
    const embeddings = isRecord(data)
      ? (data as OllamaEmbeddingResponse).embeddings
      : undefined;
    const vector = Array.isArray(embeddings) ? embeddings[0] : undefined;

    return validateVector(vector, "Ollama");
  }

  if (!env.CUSTOM_EMBEDDING_URL) {
    throw new Error("CUSTOM_EMBEDDING_URL is required for custom embeddings");
  }

  const response = await fetch(env.CUSTOM_EMBEDDING_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(env.CUSTOM_EMBEDDING_API_KEY
        ? { Authorization: `Bearer ${env.CUSTOM_EMBEDDING_API_KEY}` }
        : {})
    },
    body: JSON.stringify({ input: text, model: "bge-m3" })
  });

  if (!response.ok) {
    throw new Error(`Custom embedding endpoint failed: ${response.status}`);
  }

  const data: unknown = await response.json();
  let vector: unknown;

  if (isRecord(data)) {
    const customData = data as CustomEmbeddingResponse;
    vector = customData.embedding;

    if (vector === undefined && Array.isArray(customData.data)) {
      vector = customData.data[0]?.embedding;
    }
  }

  return validateVector(vector, "Custom");
}
