// Reads settings lazily so dotenv (local) or platform env vars (Vercel/Render) are always picked up.
const int = (v, fallback) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
};

export function getConfig() {
  const env = process.env;
  const geminiKey = env.GEMINI_API_KEY?.trim() || '';
  const anthropicKey = env.ANTHROPIC_API_KEY?.trim() || '';

  let provider = (env.LLM_PROVIDER || '').trim().toLowerCase();
  if (provider === 'claude') provider = 'anthropic';
  if (!['gemini', 'anthropic', 'offline'].includes(provider)) {
    provider = geminiKey ? 'gemini' : anthropicKey ? 'anthropic' : 'offline';
  }
  // Asked for a provider without its key -> fall back to offline demo mode instead of crashing.
  if (provider === 'gemini' && !geminiKey) provider = 'offline';
  if (provider === 'anthropic' && !anthropicKey) provider = 'offline';

  return {
    provider,
    geminiKey,
    geminiModel: env.GEMINI_MODEL?.trim() || 'gemini-3.5-flash-lite',
    geminiFallbackModel: env.GEMINI_FALLBACK_MODEL?.trim() || 'gemini-flash-lite-latest',
    anthropicKey,
    anthropicModel: env.ANTHROPIC_MODEL?.trim() || 'claude-sonnet-5',
    startPrice: 120,
    maxPrice: 150,
    floorPrice: int(env.FLOOR_PRICE, 80),
    maxTurns: int(env.MAX_TURNS, 12),
    idleSeconds: int(env.IDLE_SECONDS, 25),
  };
}
