import Groq from "groq-sdk";

let cachedResult: { ok: boolean; checkedAt: number; error?: string } | null = null;
const CACHE_TTL_MS = 60 * 1000; // avoid hammering Groq on repeated health checks

/**
 * Pings Groq with a minimal, near-zero-cost request to confirm the API key
 * is valid and the service is reachable. Result is cached briefly so the
 * /health endpoint can be polled without spamming Groq.
 */
export async function checkGroqConnection(force = false): Promise<{
  ok: boolean;
  error?: string;
}> {
  if (!process.env.GROQ_API_KEY) {
    return { ok: false, error: "GROQ_API_KEY is not set" };
  }

  if (!force && cachedResult && Date.now() - cachedResult.checkedAt < CACHE_TTL_MS) {
    return { ok: cachedResult.ok, error: cachedResult.error };
  }

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  try {
    // models.list() is a lightweight auth check — no tokens consumed, unlike
    // a chat completion call.
    await groq.models.list();
    cachedResult = { ok: true, checkedAt: Date.now() };
    return { ok: true };
  } catch (err: any) {
    const status = err?.status ?? err?.response?.status;
    const message =
      status === 401
        ? "Invalid GROQ_API_KEY"
        : err.message || "Unknown Groq connection error";

    cachedResult = { ok: false, checkedAt: Date.now(), error: message };
    return { ok: false, error: message };
  }
}