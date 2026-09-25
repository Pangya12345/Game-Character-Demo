import { buildSystemPrompt, buildUserPrompt } from './prompt.js';

const MOODS = ['neutral', 'happy', 'angry', 'stressed'];
const FIELDS = ['inner_thoughts', 'detected_language', 'npc_response', 'npc_mood', 'current_price', 'deal_closed', 'deal_failed'];
const TIMEOUT_MS = 30000;

// JSON Schema used by Claude tool-use (forces structured output).
const JSON_SCHEMA = {
  type: 'object',
  properties: {
    inner_thoughts: { type: 'string', description: 'Private reasoning before replying. Never shown to the player.' },
    detected_language: { type: 'string', enum: ['th', 'en'] },
    npc_response: { type: 'string' },
    npc_mood: { type: 'string', enum: MOODS },
    current_price: { type: 'integer' },
    deal_closed: { type: 'boolean' },
    deal_failed: { type: 'boolean' },
  },
  required: FIELDS,
};

// Same schema in Gemini's OpenAPI-subset format.
const GEMINI_SCHEMA = {
  type: 'OBJECT',
  properties: {
    inner_thoughts: { type: 'STRING' },
    detected_language: { type: 'STRING', enum: ['th', 'en'] },
    npc_response: { type: 'STRING' },
    npc_mood: { type: 'STRING', enum: MOODS },
    current_price: { type: 'INTEGER' },
    deal_closed: { type: 'BOOLEAN' },
    deal_failed: { type: 'BOOLEAN' },
  },
  required: FIELDS,
  propertyOrdering: FIELDS,
};

function parseJsonLoose(text) {
  try {
    return JSON.parse(text);
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
    throw new Error('Model did not return JSON');
  }
}

const RETRYABLE = new Set([429, 500, 502, 503, 504]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Retries briefly on "overloaded" style errors, which are usually temporary.
async function fetchWithRetry(url, options, attempts = 2) {
  for (let i = 1; ; i++) {
    const res = await fetch(url, { ...options, signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (res.ok || !RETRYABLE.has(res.status) || i >= attempts) return res;
    await sleep(700 * i);
  }
}

// Free-tier Gemini latency swings from ~2s to 30s+. To keep the vendor snappy we "hedge":
// start the main model, and if it hasn't answered after HEDGE_MS (or fails), also start the
// fallback model; whichever answers first wins. After TOTAL_MS we give up (offline reply).
const HEDGE_MS = 2500;
const TOTAL_MS = 9000;

export function callGemini(ctx) {
  const { cfg } = ctx;
  const models = [...new Set([cfg.geminiModel, cfg.geminiFallbackModel].filter(Boolean))];
  return new Promise((resolve, reject) => {
    const controllers = [];
    let started = 0;
    let failed = 0;
    let settled = false;
    let lastError;
    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(hedge);
      clearTimeout(giveUp);
      controllers.forEach((c) => c.abort());
      fn(value);
    };
    const start = () => {
      if (settled || started >= models.length) return;
      const model = models[started++];
      const ac = new AbortController();
      controllers.push(ac);
      callGeminiModel(ctx, model, ac.signal).then(
        (result) => finish(resolve, result),
        (err) => {
          lastError = err;
          failed++;
          if (!settled && err.name !== 'AbortError') console.warn(`[Gemini] ${model} failed: ${err.message.slice(0, 120)}`);
          if (started < models.length) start();
          else if (failed >= started) finish(reject, lastError);
        },
      );
    };
    const hedge = setTimeout(start, HEDGE_MS);
    const giveUp = setTimeout(() => finish(reject, new Error(`Gemini took longer than ${TOTAL_MS}ms`)), TOTAL_MS);
    start();
  });
}

async function callGeminiModel(ctx, model, signal) {
  const { cfg } = ctx;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const res = await fetch(url, {
    signal,
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': cfg.geminiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: buildSystemPrompt(cfg) }] },
      contents: [{ role: 'user', parts: [{ text: buildUserPrompt(ctx) }] }],
      generationConfig: {
        temperature: 1.05,
        responseMimeType: 'application/json',
        responseSchema: GEMINI_SCHEMA,
      },
    }),
  });
  if (!res.ok) {
    throw Object.assign(new Error(`Gemini ${model} HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`), { status: res.status });
  }
  const data = await res.json();
  const text = (data.candidates?.[0]?.content?.parts || [])
    .filter((p) => p.text && !p.thought)
    .map((p) => p.text)
    .join('');
  if (!text) throw new Error(`Gemini returned no text (finishReason: ${data.candidates?.[0]?.finishReason ?? 'unknown'})`);
  return parseJsonLoose(text);
}

export async function callAnthropic(ctx) {
  const { cfg } = ctx;
  const res = await fetchWithRetry('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': cfg.anthropicKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: cfg.anthropicModel,
      max_tokens: 800,
      system: buildSystemPrompt(cfg),
      messages: [{ role: 'user', content: buildUserPrompt(ctx) }],
      tools: [
        {
          name: 'negotiation_reply',
          description: "Send Mae Kha Som Sri's in-character reply and the updated negotiation state.",
          input_schema: JSON_SCHEMA,
        },
      ],
      tool_choice: { type: 'tool', name: 'negotiation_reply' },
    }),
  });
  if (!res.ok) throw new Error(`Anthropic HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const tool = data.content?.find((b) => b.type === 'tool_use');
  if (tool?.input) return tool.input;
  const text = data.content?.filter((b) => b.type === 'text').map((b) => b.text).join('') || '';
  return parseJsonLoose(text);
}
