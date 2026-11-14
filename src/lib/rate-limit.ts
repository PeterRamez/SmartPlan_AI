const buckets = new Map<string,{ count:number; reset:number }>();
export function rateLimit(key: string, limit = 12, windowMs = 60_000) {
  const now = Date.now(); const bucket = buckets.get(key);
  if (!bucket || bucket.reset < now) { buckets.set(key,{count:1,reset:now+windowMs}); return true; }
  if (bucket.count >= limit) return false;
  bucket.count++; return true;
}
// This process-local limiter is a dev fallback only; use a distributed store in production.
