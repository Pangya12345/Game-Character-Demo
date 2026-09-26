// Shared "real market" helpers used by both the AI path (negotiate.js) and the scripted fallback (offline.js).

// The chosen game mode locks the language: English mode = no Thai letters,
// Thai mode = must contain Thai (English words mixed in, or just numbers, are fine).
// The baht sign (U+0E3F) sits in the Thai Unicode block but is used in both languages, so it's excluded.
export function matchesLanguage(text, lang) {
  const thai = (text.match(/[฀-฾เ-๿]/g) || []).length;
  const latin = (text.match(/[A-Za-z]/g) || []).length;
  return lang === 'en' ? thai === 0 : thai > 0 || latin === 0;
}

const QTY = /(\d+(?:\.\d+)?)\s*(กิโล|โล|กก|kg|kilo)/i;
const CONFIRM = /(ตกลง|โอเค|เอาเลย|เอาตามนั้น|จัดไป|ซื้อเลย|ได้ครับ|ได้ค่ะ|ได้เลย|เอาครับ|เอาค่ะ|เอาจ้ะ|\bok\b|okay|deal|i'?ll take|take it|sounds good|let'?s do it|\byes\b|\byep\b|\bsure\b|\bfine\b)/i;
// "ไม่ตกลง", "ไม่เอา", "no deal", "not okay", "I won't take it" are refusals, not confirmations.
const REFUSE = /(ไม่\s*(ตกลง|เอา|โอเค|ซื้อ|ได้)|\bno\s+deal\b|\bnot\s+(ok|okay|a deal|fine|sure)\b|\bwon'?t\s+take\b|\bno\s+thanks?\b|\bnope\b)/i;

// Words just before a number that make it "the price somewhere else", not the player's own offer.
const COMPARE_CUE = /(ขาย|ร้าน|เจ้า|ที่อื่น|ตลาด|\bsells?\b|\bselling\b|\bstall\b|\bshop\b|\bstore\b|\bmarket\b|over there|elsewhere|\bcharges?\b)[^\d]{0,12}$/i;

// The per-kilo price the player is offering in this message, if any.
// "300 for 3 kilos" -> 100. Numbers that are the quantity itself are ignored.
// "The stall next door sells for 100, can I get 92 for 5 kilos?" -> 92 (their own number, not the comparison).
export function playerOffer(message, maxPrice) {
  const qm = message.match(QTY);
  const qty = qm ? parseFloat(qm[1]) : 0;
  const found = [];
  for (const m of message.matchAll(/\d+/g)) {
    if (qm && m.index >= qm.index && m.index < qm.index + qm[0].length) continue;
    const before = message.slice(Math.max(0, m.index - 16), m.index);
    found.push({ n: parseInt(m[0], 10), compare: COMPARE_CUE.test(before) });
  }
  const perKilo = found.filter((f) => f.n > 0 && f.n <= maxPrice);
  const own = perKilo.filter((f) => !f.compare);
  if (own.length) return own[own.length - 1].n; // the last number they asked for themselves
  if (perKilo.length) return perKilo[perKilo.length - 1].n; // only a comparison: that's the price they're after
  const total = found.find((f) => f.n > maxPrice);
  return total && qty ? Math.round(total.n / qty) : null;
}

// Only a price the player put forward themselves (not "the other stall sells for X").
export function ownOffer(message, maxPrice) {
  const offer = playerOffer(message, maxPrice);
  if (offer == null) return null;
  const onlyComparison = [...message.matchAll(/\d+/g)].every((m) => {
    const n = parseInt(m[0], 10);
    return n !== offer || COMPARE_CUE.test(message.slice(Math.max(0, m.index - 16), m.index));
  });
  return onlyComparison ? null : offer;
}

// Questions ask for something; they don't accept anything ("110 ได้ไหม?", "how about 100?").
const QUESTION = /(\?|ไหม|มั้ย|หรือเปล่า|รึเปล่า|หรือยัง|\bhow about\b|\bwhat about\b|\bcould you\b|\bcan you\b|\bwould you\b|\bwill you\b)/i;

// Is the player actually asking for a lower price (or making an offer) in this message?
// Just chatting ("I'm buying for my mom") is not asking, so the price shouldn't move.
const ASK = /(ลด|ถูกกว่า|ถูกลง|ถูก ๆ|ถูกๆ|ถูกหน่อย|ต่อราคา|ต่อหน่อย|ต่อได้|ต่ออีก|หย่อน|ราคาพิเศษ|ขอราคา|แพง|ส่วนลด|แถม|เจอกันครึ่งทาง|งบ|\bdiscount|\bcheap|\blower\b|\bless\b|\bdeal\b|\bbetter\b|\breduce|\bbargain|\bnegotiat|too (much|expensive|pricey)|\bexpensive\b|\bpricey\b|best price|\bknock\b|come down|go down|\boff\b|\bbudget\b|\bafford|any chance|how about|what about|can you do|could you do|meet (me )?(in the middle|halfway))/i;
export const asksForDiscount = (message, maxPrice) => playerOffer(message, maxPrice) != null || ASK.test(message);

// How many kilos the player has said they'll buy (their most recent mention), or null.
const KILO_WORDS = { หนึ่ง: 1, สอง: 2, สาม: 3, สี่: 4, ห้า: 5, หก: 6, สิบ: 10, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, ten: 10 };
const KILOS = /(\d+(?:\.\d+)?|หนึ่ง|สอง|สาม|สี่|ห้า|หก|สิบ|one|two|three|four|five|six|ten)\s*(กิโล|โล|กก|kg|kilo)/gi;
export function mentionedKilos(texts) {
  let kilos = null;
  for (const t of texts) {
    for (const m of t.matchAll(KILOS)) kilos = KILO_WORDS[m[1].toLowerCase()] ?? parseFloat(m[1]);
  }
  return kilos;
}

// Has the kilo question already been settled (she asked before, or the player said an amount)?
const KILO_QUESTION = /(กี่โล|กี่กิโล|how many kilo|how many kg|how much do you need|how many you need|how many are you)/i;
export const kiloQuestionDone = (history, message) =>
  mentionedKilos([...history.filter((h) => h.role === 'player').map((h) => h.text), message]) != null ||
  history.some((h) => h.role === 'npc' && KILO_QUESTION.test(h.text));

// Drop a repeated "how many kilos?" from her reply, keeping the rest of what she said.
export function dropKiloQuestion(text) {
  const m = KILO_QUESTION.exec(text);
  if (!m) return text;
  const start = Math.max(text.lastIndexOf(' ', m.index), text.lastIndexOf('.', m.index), text.lastIndexOf('!', m.index), text.lastIndexOf(',', m.index));
  const qEnd = text.indexOf('?', m.index);
  const end = qEnd === -1 ? text.length : qEnd + 1;
  const cut = (text.slice(0, start + 1) + text.slice(end)).replace(/\s+/g, ' ').replace(/\s*(ว่าแต่|แล้ว|so|and)\s*$/i, '').trim();
  return cut.length >= 8 ? cut : text; // never leave her with almost nothing to say
}

// Scripted fallback: does the message clearly say "yes, I'll buy"?
export const saysYes = (message) =>
  (CONFIRM.test(message) || /เอา\s*(\d+\s*(บาท)?\s*)?(นะ|ครับ|ค่ะ|คะ|จ้ะ|จ้า|เลย|ก็ได้|ละ|แล้ว)/.test(message)) &&
  !REFUSE.test(message) && !QUESTION.test(message);

// The AI decided the player agreed; veto only what clearly isn't a "yes, I'll buy at this price":
// a refusal, a question, or a new offer below the closing price.
export function isConfirmation(message, price, maxPrice) {
  if (REFUSE.test(message) || QUESTION.test(message)) return false;
  const offer = playerOffer(message, maxPrice);
  return offer == null || offer >= price;
}
