// Rule-based stand-in for the LLM. Used when no API key is configured, or when the API call fails,
// so the game is always playable. It is intentionally simpler than the real AI.

const THAI = /[฀-๿]/;
const NUM_WORDS = { หนึ่ง: 1, สอง: 2, สาม: 3, สี่: 4, ห้า: 5, หก: 6, สิบ: 10, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, ten: 10 };

const RE = {
  qty: /(\d+(?:\.\d+)?|หนึ่ง|สอง|สาม|สี่|ห้า|หก|สิบ|one|two|three|four|five|six|ten)\s*(กิโล|โล|กก|kg|kilo)/i,
  polite: /(ครับ|คับ|ค่ะ|คะ|จ้ะ|จ้า|จ๊ะ|ขอบคุณ|please|kindly|thank)/i,
  charm: /(สวย|ใจดี|น่ารัก|คนเก่ง|ยาย|แม่|ประจำ|อุดหนุน|beautiful|kind|lovely|sweet auntie|regular|come back|every week)/i,
  reason: /(เพราะ|ร้านอื่น|เจ้าอื่น|ร้านโน้น|นักศึกษา|เงินน้อย|งบ|ช้ำ|ลูกเล็ก|because|other (stall|shop)|cheaper|student|budget|bruise|small)/i,
  rude: /(โกง|ขี้โกง|ห่วย|เหี้ย|ควาย|บ้าป่าว|แพงฉิบ|stupid|scam|rip ?off|idiot|thief|greedy)/i,
  accept: /(ตกลง|เอาเลย|โอเค|ซื้อเลย|เอาตามนั้น|\bok\b|okay|deal|i'?ll take)/i,
};

const LINES = {
  th: {
    rude: ['พูดจาดี ๆ หน่อยพ่อคุณ! ปากแบบนี้ป้าขึ้นเป็น {price} บาทเลย', 'โอ๊ย ปากเสียแบบนี้ไม่ขายให้ง่าย ๆ หรอก {price} บาท จะเอาไม่เอา!'],
    lowball: ['{offer} บาท?! ไปเก็บเองจากต้นไป๊! ต้นทุนป้ายังไม่พอเลย', 'ล้อเล่นใช่ไหม {offer} บาท ค่าน้ำมันรถป้ายังไม่พอเลยลูก!'],
    acceptOffer: ['เฮ้อ... {price} บาทก็ได้ เห็นแก่ความน่ารักหรอกนะ เดี๋ยวป้าห่อให้', 'เอ้า ตกลง {price} บาทจ้ะ ป้าแถมลูกเล็กให้อีกลูกด้วย'],
    deal: ['ตกลงกิโลละ {price} บาทนะจ๊ะ เดี๋ยวป้าเลือกลูกสวย ๆ ให้เลย', 'ได้เลยจ้ะ {price} บาท หวานฉ่ำรับรอง กินแล้วต้องกลับมาอีก'],
    counter: ['{offer} ไม่ไหวหรอกหนู ป้าให้ {price} บาทละกัน ลดให้แล้วนะ', 'ต่อเก่งจริงนะเรา! {price} บาทเป็นไง ต่ำกว่านี้ป้าเจ๊งแน่'],
    soften: ['พูดเพราะแบบนี้ป้าก็ใจอ่อนสิ งั้น {price} บาทละกันจ้ะ', 'เออ ๆ เห็นว่าตั้งใจซื้อจริง ป้าให้ {price} บาท'],
    grumble: ['จะให้ลดเฉย ๆ เหรอ? ให้เหตุผลป้าหน่อยสิ ตอนนี้ {price} บาทจ้ะ', 'มะม่วงหวานขนาดนี้ {price} บาทก็ถูกแล้วพ่อหนุ่ม'],
    floor: ['{price} บาทนี่ต่ำสุดแล้วจริง ๆ ลดกว่านี้ป้าไม่มีกินแล้ว'],
    final: ['คุยวนไปวนมาป้าเหนื่อยแล้ว วันนี้ไม่ขายแล้วจ้ะ ไปเถอะไป'],
  },
  en: {
    rude: ["Watch your mouth, child! For that it's {price} baht now.", 'Such manners! Fine, {price} baht. Take it or leave it!'],
    lowball: ['{offer} baht?! Go pick them off the tree yourself!', "{offer}? That doesn't even pay for my truck's diesel, dear!"],
    acceptOffer: ["Hmph... {price} baht then. Only because you're sweet. Let me bag them.", "Okay, okay, {price} baht. I'll even throw in a small one, na."],
    deal: ['Deal, {price} baht a kilo. Let me pick the nicest ones for you.', "{price} it is! So sweet you'll be back tomorrow, I promise."],
    counter: ["{offer} is too low, dear. I'll do {price}, that's already a discount.", 'You bargain hard! {price} baht, any lower and I go broke.'],
    soften: ['Such nice manners, you make auntie soft. {price} baht then.', "Alright, you seem serious. {price} baht for you."],
    grumble: ["Just 'cheaper' and nothing else? Give auntie a reason. It's {price} baht.", 'Mangoes this sweet at {price}? That is already cheap, young one.'],
    floor: ["{price} is truly my lowest. Any less and auntie doesn't eat tonight."],
    final: ["We've gone round and round, I'm tired. No sale today, off you go."],
  },
};

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const fill = (s, v) => s.replace(/\{(\w+)\}/g, (_, k) => v[k]);

function parseQty(text) {
  const m = text.match(RE.qty);
  if (!m) return { qty: 0, span: null };
  const raw = m[1].toLowerCase();
  const qty = NUM_WORDS[raw] ?? parseFloat(raw);
  return { qty, span: [m.index, m.index + m[0].length] };
}

function parseOffer(text, qtySpan) {
  for (const m of text.matchAll(/\d+/g)) {
    if (qtySpan && m.index >= qtySpan[0] && m.index < qtySpan[1]) continue;
    const n = parseInt(m[0], 10);
    if (n > 0 && n <= 200) return n; // bigger numbers are budgets/totals, not a per-kg offer
  }
  return null;
}

export function offlineReply({ cfg, message, state, finalTurn }) {
  const lang = THAI.test(message) ? 'th' : /[a-z]/i.test(message) ? 'en' : state.lang;
  const L = LINES[lang];
  const { qty, span } = parseQty(message);
  const offer = parseOffer(message, span);
  const polite = RE.polite.test(message);
  const charm = RE.charm.test(message);
  const reason = RE.reason.test(message);

  let price = state.price;
  let mood = 'neutral';
  let closed = false;
  let key;

  if (RE.rude.test(message)) {
    price = Math.min(price + 5, cfg.maxPrice);
    mood = 'angry';
    key = 'rude';
  } else if (offer != null && offer < cfg.floorPrice * 0.7) {
    mood = 'angry';
    key = 'lowball';
  } else if (offer != null && offer >= price) {
    closed = true;
    mood = 'happy';
    key = 'deal';
  } else if (offer != null) {
    const step = Math.min(10, 2 + polite * 3 + charm * 2 + reason * 2 + (qty >= 3 ? 3 : qty >= 2 ? 1 : 0));
    const willing = Math.max(cfg.floorPrice, price - step);
    if (offer >= willing) {
      closed = true;
      price = offer;
      mood = 'happy';
      key = 'acceptOffer';
    } else {
      price = willing;
      mood = step >= 6 ? 'happy' : price - offer > 20 ? 'stressed' : 'neutral';
      key = price === cfg.floorPrice ? 'floor' : 'counter';
    }
  } else if (RE.accept.test(message)) {
    closed = true;
    mood = 'happy';
    key = 'deal';
  } else if (polite || charm || reason || qty >= 2) {
    price = Math.max(cfg.floorPrice, price - Math.min(6, 1 + polite * 2 + charm * 2 + reason + (qty >= 3 ? 2 : 0)));
    mood = charm ? 'happy' : 'neutral';
    key = price === cfg.floorPrice ? 'floor' : 'soften';
  } else {
    key = 'grumble';
  }

  let failed = false;
  if (!closed && finalTurn) {
    failed = true;
    mood = 'stressed';
    key = 'final';
  }

  return {
    detected_language: lang,
    npc_response: fill(pick(L[key]), { price, offer }),
    npc_mood: mood,
    current_price: price,
    deal_closed: closed,
    deal_failed: failed,
  };
}
