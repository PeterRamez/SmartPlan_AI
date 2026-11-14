import { z } from "zod";
const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  AI_PROVIDER: z.enum(["ollama","cloudflare"]).default("ollama"),
  EMBEDDING_PROVIDER: z.enum(["ollama","custom"]).default("ollama"),
  OLLAMA_BASE_URL: z.string().url().default("http://localhost:11434"),
  OLLAMA_LLM_MODEL: z.string().default("llama3.1:8b"),
  OLLAMA_EMBEDDING_MODEL: z.string().default("bge-m3"),
  CLOUDFLARE_ACCOUNT_ID: z.string().optional(),
  CLOUDFLARE_API_TOKEN: z.string().optional(),
  LLM_MODEL: z.string().default("@cf/meta/llama-3.1-8b-instruct"),
  GOOGLE_SERVICE_ACCOUNT_EMAIL: z.string().optional(),
  GOOGLE_PRIVATE_KEY: z.string().optional(),
  GOOGLE_DRIVE_ROOT_FOLDER_ID: z.string().optional(),
  INGESTION_SECRET: z.string().optional(),
  CUSTOM_EMBEDDING_URL: z.string().optional(),
  CUSTOM_EMBEDDING_API_KEY: z.string().optional()
});
export const env = schema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  AI_PROVIDER: process.env.AI_PROVIDER,
  EMBEDDING_PROVIDER: process.env.EMBEDDING_PROVIDER,
  OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL,
  OLLAMA_LLM_MODEL: process.env.OLLAMA_LLM_MODEL,
  OLLAMA_EMBEDDING_MODEL: process.env.OLLAMA_EMBEDDING_MODEL,
  CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID,
  CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_API_TOKEN,
  LLM_MODEL: process.env.LLM_MODEL,
  GOOGLE_SERVICE_ACCOUNT_EMAIL: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  GOOGLE_PRIVATE_KEY: process.env.GOOGLE_PRIVATE_KEY,
  GOOGLE_DRIVE_ROOT_FOLDER_ID: process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID,
  INGESTION_SECRET: process.env.INGESTION_SECRET,
  CUSTOM_EMBEDDING_URL: process.env.CUSTOM_EMBEDDING_URL,
  CUSTOM_EMBEDDING_API_KEY: process.env.CUSTOM_EMBEDDING_API_KEY
});
