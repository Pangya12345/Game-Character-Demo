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

// Tries the main model first, then the fallback model if the main one is overloaded or out of quota.
export async function callGemini(ctx) {
  const { cfg } = ctx;
  const models = [...new Set([cfg.geminiModel, cfg.geminiFallbackModel].filter(Boolean))];
  let lastError;
  for (const model of models) {
    try {
      return await callGeminiModel(ctx, model);
    } catch (err) {
      lastError = err;
      if (!RETRYABLE.has(err.status)) throw err;
      console.warn(`[Gemini] ${model} unavailable (HTTP ${err.status}), trying next model`);
    }
  }
  throw lastError;
}

async function callGeminiModel(ctx, model) {
  const { cfg } = ctx;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const res = await fetchWithRetry(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': cfg.geminiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: buildSystemPrompt(cfg) }] },
      contents: [{ role: 'user', parts: [{ text: buildUserPrompt(ctx) }] }],
      generationConfig: {
        temperature: 0.9,
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
