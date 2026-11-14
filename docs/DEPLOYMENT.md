# Vercel deployment

1. Push this repository to GitHub.
2. Import it in Vercel; select Next.js and Node.js runtime.
3. Add all required environment variables from `.env.example` in Vercel Project Settings.
4. Use a hosted Supabase project; run migrations before deploying.
5. Set `NEXT_PUBLIC_SITE_URL` only if you add it to your own configuration; Supabase redirect URLs must match the deployed domain.
6. Deploy and verify `/login`, `/dashboard`, `/api/health`.
7. Configure a scheduled external worker/cron to call the protected ingestion endpoint in small batches, or use the dashboard's manual processing action. Never expose the ingestion secret to browser code.

Vercel functions are time-limited and stateless. The endpoint processes a small bounded batch per invocation and stores progress in Postgres. For large corpora, use a dedicated worker/queue (Cloudflare Queues, Trigger.dev, Inngest, or a worker on a persistent host) rather than increasing a single request duration indefinitely.

## Runtime notes
- Document extraction routes use Node.js runtime.
- Do not rely on `/tmp` or project filesystem for persistent files.
- This MVP stores extracted text and chunk metadata in Postgres. Add Supabase Storage for original files before production uploads.
- Configure server-side Ollama/custom embedding endpoints reachable from Vercel. A laptop's localhost is not reachable from Vercel.
