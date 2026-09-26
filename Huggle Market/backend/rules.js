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

// The per-kilo price the player is offering in this message, if any.
// "300 for 3 kilos" -> 100. Numbers that are the quantity itself are ignored.
export function playerOffer(message, maxPrice) {
  const qm = message.match(QTY);
  const qty = qm ? parseFloat(qm[1]) : 0;
  const nums = [];
  for (const m of message.matchAll(/\d+/g)) {
    if (qm && m.index >= qm.index && m.index < qm.index + qm[0].length) continue;
    nums.push(parseInt(m[0], 10));
  }
  const perKilo = nums.filter((n) => n > 0 && n <= maxPrice);
  if (perKilo.length) return Math.max(...perKilo);
  const total = nums.find((n) => n > maxPrice);
  return total && qty ? Math.round(total / qty) : null;
}

// Questions ask for something; they don't accept anything ("110 ได้ไหม?", "how about 100?").
const QUESTION = /(\?|ไหม|มั้ย|หรือเปล่า|รึเปล่า|หรือยัง|\bhow about\b|\bwhat about\b|\bcould you\b|\bcan you\b|\bwould you\b|\bwill you\b)/i;

// Scripted fallback: does the message clearly say "yes, I'll buy"?
// Is the player actually asking for a lower price (or making an offer) in this message?
// Just chatting ("I'm buying for my mom") is not asking, so the price shouldn't move.
const ASK = /(ลด|ถูกกว่า|ถูกลง|ถูก ๆ|ถูกๆ|ต่อราคา|ต่อหน่อย|ต่อได้|แพง|ส่วนลด|แถม|discount|cheap|lower|less|deal|too (much|expensive|pricey)|expensive|pricey|best price|knock|come down|go down|off|budget|can'?t afford)/i;
export const asksForDiscount = (message, maxPrice) => playerOffer(message, maxPrice) != null || ASK.test(message);

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
