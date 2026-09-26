// Core game logic shared by the Express server (local / Render) and the Vercel serverless functions.
import { getConfig } from './config.js';
import { callAnthropic, callGemini } from './llm.js';
import { chatLine, offlineReply, patienceOutLine } from './offline.js';
import { asksForDiscount, isConfirmation, matchesLanguage, playerOffer } from './rules.js';

const MOODS = ['neutral', 'happy', 'angry', 'stressed'];
const MAX_MESSAGE = 280;
const MAX_HISTORY = 40;

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

// ---- Repeated questions -------------------------------------------------------------
// Counts how many earlier player messages say basically the same thing as this one.
// Same wording (ignoring spaces, punctuation, Thai politeness particles) AND the same
// numbers = a repeat. Changing the offer ("100" -> "95") is new, not a repeat.
const FILLER = /(ครับ|คับ|ค่ะ|คะ|นะ|จ้ะ|จ้า|จ๊ะ|หน่อย|ป้า|แม่ค้า|please|pls|auntie)/gi;

function normalize(text) {
  return text.toLowerCase().replace(FILLER, '').replace(/[\s\p{P}\p{S}]/gu, '');
}

function bigrams(str) {
  const out = new Map();
  for (let i = 0; i < str.length - 1; i++) {
    const g = str.slice(i, i + 2);
    out.set(g, (out.get(g) || 0) + 1);
  }
  return out;
}

function similarity(a, b) {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  const A = bigrams(a);
  const B = bigrams(b);
  let overlap = 0;
  for (const [g, n] of A) overlap += Math.min(n, B.get(g) || 0);
  return (2 * overlap) / (a.length - 1 + b.length - 1);
}

// Which repeat ends the deal: 4, 5 or 6 repeats (= asking the 5th, 6th or 7th time), per game.
export const repeatLimit = (daySeed) => 4 + (daySeed % 3);

// 0 = not a repeat, 1 = noticed, 2 = irritated, 3 = final warning, 4 = ends the deal
export function repeatLevel(repeats, limit) {
  if (!repeats) return 0;
  if (repeats >= limit) return 4;
  if (repeats === limit - 1) return 3;
  return repeats >= 2 ? 2 : 1;
}

export function countRepeats(message, history) {
  const numbers = (t) => (t.match(/\d+/g) || []).join(',');
  const cur = normalize(message);
  if (cur.length < 2) return 0;
  return history.filter(
    (h) => h.role === 'player' && !h.text.startsWith('(') &&
      numbers(h.text) === numbers(message) && similarity(normalize(h.text), cur) >= 0.75,
  ).length;
}

// Never trust the model blindly: enforce the JSON contract and the price rules server-side.
function sanitizeResult(raw, { cfg, message, state, history = [], repeatLvl = 0 }) {
  const lang = state.lang; // fixed by the game mode the player picked

  let price = Math.round(Number(raw?.current_price));
  if (!Number.isFinite(price)) price = state.price;
  price = Math.min(price, state.price + 5, cfg.maxPrice); // a price bump is 5 baht at most
  price = Math.max(price, cfg.floorPrice);

  let npc_mood = MOODS.includes(raw?.npc_mood) ? raw.npc_mood : 'neutral';

  // Like a real vendor: never quote below what the buyer just offered...
  const offer = playerOffer(message, cfg.maxPrice);
  if (offer && offer <= state.price && price < offer) price = offer;
  // If she already said yes to the buyer's previous offer, pushing for more gets at most 3 baht.
  const lastPlayer = [...history].reverse().find((h) => h.role === 'player' && !h.text.startsWith('('));
  const prevOffer = lastPlayer ? playerOffer(lastPlayer.text, cfg.maxPrice) : null;
  // (her asking price equals what they offered last time = she agreed to it)
  if (prevOffer != null && prevOffer === state.price) price = Math.max(price, state.price - 3);
  // A seasoned vendor gives ground slowly: at most 7 baht per turn, unless she's accepting their own offer,
  // and a bare "cheaper?" with no reason, amount or offer earns 3 baht at most.
  const plainAsk = offer == null && !/\d/.test(message) && message.length <= 25;
  const maxStep = plainAsk ? 3 : 7;
  if (price < state.price - maxStep && price !== offer) price = state.price - maxStep;
  // A real vendor doesn't cut the price just because you're chatting: they have to ask.
  // If the model cut it anyway, keep the price and swap in a friendly chat line so words and price agree.
  let chatOnly = false;
  if (price < state.price && !asksForDiscount(message, cfg.maxPrice) && raw?.deal_closed !== true) {
    price = state.price;
    chatOnly = true;
  }
  // ...and only raise the price when the player was genuinely rude (she's angry).
  if (price > state.price && npc_mood !== 'angry') price = state.price;

  // Agreeing to an offer is not a sale: the buyer has to confirm.
  const deal_closed = raw?.deal_closed === true && isConfirmation(message, price, cfg.maxPrice);
  let deal_failed = !deal_closed && raw?.deal_failed === true;
  if (deal_closed && npc_mood === 'angry') npc_mood = 'happy';

  // Asking the same thing again: no discount, and she gets more and more fed up.
  if (repeatLvl > 0 && !deal_closed) {
    price = Math.max(price, state.price);
    if (repeatLvl >= 3) npc_mood = 'angry';
    else if (npc_mood !== 'angry') npc_mood = 'stressed';
    if (repeatLvl >= 4) deal_failed = true;
  }

  // ---- Patience (0-100): one meter for everything that wears her down or wins her over ----
  let change = Math.round(Number(raw?.patience_change));
  if (!Number.isFinite(change)) change = 0;
  // one message can cost at most 30, unless she refuses to sell over it (insults can empty it)
  change = Math.max(deal_failed ? -100 : -30, Math.min(12, change));
  if (offer != null && offer < cfg.floorPrice * 0.65) change = Math.min(change, -6); // silly lowball
  if (repeatLvl > 0) change = Math.min(change, -(5 + 5 * repeatLvl)); // asking the same thing again
  if (npc_mood === 'angry') change = Math.min(change, -8);
  let patience = Math.max(0, Math.min(100, state.patience + change));
  if (deal_closed) patience = Math.max(patience, state.patience);
  if (repeatLvl >= 4) patience = 0; // asked the same thing after her final warning
  let ranOut = false;
  if (patience === 0 && !deal_closed && !deal_failed) {
    deal_failed = true;
    npc_mood = 'angry';
    ranOut = true;
  }
  // why it ended, so the result screen can say it honestly
  const end_reason = !deal_failed ? undefined
    : repeatLvl >= 4 ? 'repeat'
      : ranOut ? 'patience'
        : change <= -60 ? 'insult' // she refused over something that emptied her patience at once
          : 'refused';

  let npc_response = typeof raw?.npc_response === 'string' ? raw.npc_response.trim().slice(0, 320) : '';
  if (ranOut) npc_response = patienceOutLine(lang, history); // what she says must match what happens
  else if (chatOnly) npc_response = chatLine(lang, history);
  if (!npc_response) {
    npc_response = lang === 'th' ? 'ว่าไงนะ ป้าฟังไม่ทัน พูดใหม่ซิ' : "Sorry, I didn't catch that. Say it again?";
  }
  // If the rules above moved her price, make the number she says match the price on screen.
  const aiPrice = Math.round(Number(raw?.current_price));
  if (Number.isFinite(aiPrice) && aiPrice !== price) {
    npc_response = npc_response.replace(new RegExp(`(^|\\D)${aiPrice}(?!\\d)`, 'g'), `$1${price}`);
  }

  return { detected_language: lang, npc_response, npc_mood, current_price: price, deal_closed, deal_failed, patience, ...(end_reason ? { end_reason } : {}) };
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
  const typed = typeof body?.message === 'string' ? body.message.trim().slice(0, MAX_MESSAGE) : '';
  // Thai digits (๑๐๐) -> 100 so offers written in Thai numerals are understood too.
  const message = typed.replace(/[๐-๙]/g, (d) => String(d.charCodeAt(0) - 0x0e50));
  if (!message) return { status: 400, json: { error: 'empty_message' } };

  const s = body.state || {};
  const state = {
    price: clampInt(s.current_price, cfg.floorPrice, cfg.maxPrice, cfg.startPrice),
    turn: clampInt(s.turn, 1, 9999, 1),
    lang: s.lang === 'en' ? 'en' : 'th',
    daySeed: clampInt(s.day_seed, 0, 9999, 0),
    patience: clampInt(s.patience, 0, 100, 100),
  };
  if (!matchesLanguage(typed, state.lang)) return { status: 400, json: { error: 'wrong_language', expected: state.lang } };
  const history = sanitizeHistory(body.history);
  const repeatLvl = repeatLevel(countRepeats(message, history), repeatLimit(state.daySeed));
  const ctx = { cfg, message, state, history, repeatLvl, asked: asksForDiscount(message, cfg.maxPrice) };

  let raw = null;
  let mode = cfg.provider;
  let warning;
  if (cfg.provider !== 'offline') {
    try {
      raw = cfg.provider === 'gemini' ? await callGemini(ctx) : await callAnthropic(ctx);
      if (process.env.DEBUG_THOUGHTS && raw?.inner_thoughts) console.log('[Som Sri thinks]', raw.inner_thoughts);
      // The model slipped into the other language: use the scripted reply for this turn instead.
      if (typeof raw?.npc_response !== 'string' || !raw.npc_response.trim() || !matchesLanguage(raw.npc_response, state.lang)) {
        raw = null;
        mode = 'offline-fallback';
      }
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
