// Core game logic shared by the Express server (local / Render) and the Vercel serverless functions.
import { getConfig } from './config.js';
import { callAnthropic, callGemini } from './llm.js';
import { offlineReply } from './offline.js';

const MOODS = ['neutral', 'happy', 'angry', 'stressed'];
const MAX_MESSAGE = 280;
const MAX_HISTORY = 24;

const clampInt = (v, min, max, fallback) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

// Very small per-instance rate limiter (good enough to stop accidental spam from one browser).
const hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now > entry.reset) {
    hits.set(ip, { count: 1, reset: now + 60_000 });
    if (hits.size > 5000) hits.clear();
    return false;
  }
  entry.count += 1;
  return entry.count > 40;
}

function sanitizeHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .filter((h) => h && (h.role === 'npc' || h.role === 'player') && typeof h.text === 'string')
    .slice(-MAX_HISTORY)
    .map((h) => ({ role: h.role, text: h.text.slice(0, 400) }));
}

// The chosen game mode locks the language: English mode = no Thai letters,
// Thai mode = must contain Thai (English words mixed in, or just numbers, are fine).
export function matchesLanguage(text, lang) {
  const thai = (text.match(/[\u0E00-\u0E7F]/g) || []).length;
  const latin = (text.match(/[A-Za-z]/g) || []).length;
  return lang === 'en' ? thai === 0 : thai > 0 || latin === 0;
}

// Never trust the model blindly: enforce the JSON contract and the price rules server-side.
function sanitizeResult(raw, { cfg, message, state }) {
  const lang = state.lang; // fixed by the game mode the player picked

  let price = Math.round(Number(raw?.current_price));
  if (!Number.isFinite(price)) price = state.price;
  price = Math.min(price, state.price + 10, cfg.maxPrice);
  price = Math.max(price, cfg.floorPrice);

  const deal_closed = raw?.deal_closed === true;
  const deal_failed = !deal_closed && raw?.deal_failed === true;
  let npc_mood = MOODS.includes(raw?.npc_mood) ? raw.npc_mood : 'neutral';
  if (deal_closed && npc_mood === 'angry') npc_mood = 'happy';

  let npc_response = typeof raw?.npc_response === 'string' ? raw.npc_response.trim().slice(0, 320) : '';
  if (!npc_response) {
    npc_response = lang === 'th' ? 'ว่าไงนะพ่อหนุ่ม ป้าฟังไม่ทัน พูดใหม่ซิ' : "Eh? Say that again, dear, auntie didn't catch it.";
  }

  return { detected_language: lang, npc_response, npc_mood, current_price: price, deal_closed, deal_failed };
}

export function publicConfig() {
  const cfg = getConfig();
  const model = cfg.provider === 'gemini' ? cfg.geminiModel : cfg.provider === 'anthropic' ? cfg.anthropicModel : null;
  return {
    startPrice: cfg.startPrice,
    idleSeconds: cfg.idleSeconds,
    maxPrice: cfg.maxPrice,
    provider: cfg.provider,
    model,
  };
}

export async function negotiate(body, ip = 'unknown') {
  if (rateLimited(ip)) return { status: 429, json: { error: 'rate_limited' } };

  const cfg = getConfig();
  const message = typeof body?.message === 'string' ? body.message.trim().slice(0, MAX_MESSAGE) : '';
  if (!message) return { status: 400, json: { error: 'empty_message' } };

  const s = body.state || {};
  const state = {
    price: clampInt(s.current_price, cfg.floorPrice, cfg.maxPrice, cfg.startPrice),
    turn: clampInt(s.turn, 1, 9999, 1),
    lang: s.lang === 'en' ? 'en' : 'th',
    daySeed: clampInt(s.day_seed, 0, 9999, 0),
  };
  if (!matchesLanguage(message, state.lang)) return { status: 400, json: { error: 'wrong_language', expected: state.lang } };
  const ctx = { cfg, message, state, history: sanitizeHistory(body.history) };

  let raw = null;
  let mode = cfg.provider;
  let warning;
  if (cfg.provider !== 'offline') {
    try {
      raw = cfg.provider === 'gemini' ? await callGemini(ctx) : await callAnthropic(ctx);
      if (process.env.DEBUG_THOUGHTS && raw?.inner_thoughts) console.log('[Som Sri thinks]', raw.inner_thoughts);
    } catch (err) {
      console.error('[LLM error]', err.message);
      mode = 'offline-fallback';
      warning = 'llm_error';
    }
  }
  if (!raw) raw = offlineReply(ctx);

  // inner_thoughts is stripped here: the client only ever sees the spec'd JSON fields.
  const result = sanitizeResult(raw, ctx);
  return { status: 200, json: { ...result, mode, ...(warning ? { warning } : {}) } };
}
