import { asksForDiscount, playerOffer, saysYes } from './rules.js';

// Rule-based stand-in for the LLM. Used when no API key is configured, or when the API call fails,
// so the game is always playable. It is intentionally simpler than the real AI.

const NUM_WORDS = { หนึ่ง: 1, สอง: 2, สาม: 3, สี่: 4, ห้า: 5, หก: 6, สิบ: 10, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, ten: 10 };

const RE = {
  qty: /(\d+(?:\.\d+)?|หนึ่ง|สอง|สาม|สี่|ห้า|หก|สิบ|one|two|three|four|five|six|ten)\s*(กิโล|โล|กก|kg|kilo)/i,
  polite: /(ครับ|คับ|ค่ะ|คะ|จ้ะ|จ้า|จ๊ะ|ขอบคุณ|please|kindly|thank)/i,
  charm: /(สวย|ใจดี|น่ารัก|คนเก่ง|ยาย|แม่|ประจำ|อุดหนุน|beautiful|kind|lovely|sweet auntie|regular|come back|every week)/i,
  reason: /(เพราะ|ร้านอื่น|เจ้าอื่น|ร้านโน้น|นักศึกษา|เงินน้อย|งบ|ช้ำ|ลูกเล็ก|because|other (stall|shop)|cheaper|student|budget|bruise|small)/i,
  // swearing / insults: the vendor refuses to sell immediately
  severe: /(เหี้ย|สัส|สาด|ควาย|อีแก่|แก่หัวงู|ไอ้สัตว์|อีดอก|หน้าหี|ชิบหาย|พ่อมึง|แม่มึง|มึง|กู|fuck|shit|bitch|bastard|asshole|old hag|thief|cheat)/i,
  rude: /(โกง|ขี้โกง|ห่วย|บ้าป่าว|แพงฉิบ|แพงชะมัด|stupid|scam|rip ?off|idiot|greedy)/i,
};

const LINES = {
  th: {
    rude: ['พูดจาดี ๆ หน่อยพ่อคุณ! ปากแบบนี้ป้าขึ้นเป็น {price} บาทเลย', 'โอ๊ย ปากเสียแบบนี้ไม่ขายให้ง่าย ๆ หรอก {price} บาท จะเอาไม่เอา!'],
    lowball: ['{offer} บาท?! ไปเก็บเองจากต้นไป๊! ต้นทุนป้ายังไม่พอเลย', 'ล้อเล่นใช่ไหม {offer} บาท ค่าน้ำมันรถป้ายังไม่พอเลยลูก!'],
    acceptOffer: ['เฮ้อ... {price} บาทก็ได้ เห็นแก่ความน่ารักหรอกนะ จะเอาเลยไหมล่ะ?', 'ก็ได้ ๆ {price} บาท ตกลงเอาเลยไหมจ๊ะ ป้าจะได้ห่อให้', 'เอาเถอะ {price} ก็ได้จ้ะ เอาเลยมั้ย?'],
    deal: ['ตกลงกิโลละ {price} บาทนะจ๊ะ เดี๋ยวป้าเลือกลูกสวย ๆ ให้เลย', 'ได้เลยจ้ะ {price} บาท หวานฉ่ำรับรอง กินแล้วต้องกลับมาอีก'],
    counter: [
      '{offer} ไม่ไหวหรอกหนู ป้าให้ {price} บาทละกัน ลดให้แล้วนะ',
      'ต่อเก่งจริงนะเรา! {price} บาทเป็นไง ต่ำกว่านี้ป้าเจ๊งแน่',
      '{offer} เหรอ... ไม่ได้ ๆ {price} ก็แล้วกัน',
      'โห {offer} ป้าขาดทุนตายเลย {price} นี่ใจดีสุดแล้วนะ',
      'ถ้า {offer} ป้าไปขายเจ้าอื่นดีกว่า เอา {price} ไหมล่ะ?',
    ],
    soften: [
      'พูดเพราะแบบนี้ป้าก็ใจอ่อนสิ งั้น {price} บาทละกันจ้ะ',
      'เออ ๆ เห็นว่าตั้งใจซื้อจริง ป้าให้ {price} บาท',
      'ปากหวานนักนะ... ก็ได้ {price} บาท อย่าไปบอกใครล่ะ',
      'เห็นหน้าแล้วนึกถึงหลานป้า ลดให้เหลือ {price} ละกัน',
    ],
    grumble: [
      'จะให้ลดเฉย ๆ เหรอ? ให้เหตุผลป้าหน่อยสิ ตอนนี้ {price} บาทจ้ะ',
      'มะม่วงหวานขนาดนี้ {price} บาทก็ถูกแล้วพ่อหนุ่ม',
      'ลองดมดูสิ หอมขนาดนี้ {price} ไม่แพงหรอกจ้ะ',
      'ลดหน่อย ๆ ใคร ๆ ก็พูด... แล้วจะเอากี่โลล่ะ? {price} บาทนะ',
      'ถามราคาเฉย ๆ ป้าก็ตอบเหมือนเดิมแหละ {price} จ้ะ',
    ],
    floor: ['{price} บาทนี่ต่ำสุดแล้วจริง ๆ ลดกว่านี้ป้าไม่มีกินแล้ว'],
    chat: ['ขอบใจจ้ะ มะม่วงป้าหวานจริงนะ ว่าแต่จะเอาสักกี่โลดีล่ะ?', 'อืม... ดีจังเลยจ้ะ ถ้าชอบก็ลองเลือกดูได้นะลูก', 'จ้ะ ๆ ป้าฟังอยู่ อยากได้กี่โลก็บอกป้านะ'],
    final: ['คุยวนไปวนมาป้าเหนื่อยแล้ว วันนี้ไม่ขายแล้วจ้ะ ไปเถอะไป'],
    severe: ['ปากหมาแบบนี้ป้าไม่ขายให้หรอก! ไปให้พ้นเลย ไป๊!', 'ด่าคนแก่แบบนี้ได้ยังไง! ไม่ขายแล้ว ไปซื้อที่อื่นไป!'],
    // her patience ran out
    patienceOut: ['พอแล้ว ป้าหมดความอดทนแล้ว! ไม่ขายแล้ว ไปซื้อที่อื่นเถอะ', 'เฮ้อ ไม่ไหวแล้วจริง ๆ ป้าไม่ขายแล้วนะ ไปเถอะไป'],
    // asking the same thing again (index = repeat count - 1)
    repeat: [
      ['ก็ถามไปแล้วไงลูก ป้าก็ตอบไปแล้ว {price} จ้ะ', 'ถามซ้ำก็ได้คำตอบเดิมแหละ {price} บาท'],
      ['ถามอยู่นั่นแหละ! มีอะไรใหม่ ๆ มาพูดบ้างไหม', 'เฮ้อ ป้าฟังจนเบื่อแล้วนะ พูดอย่างอื่นบ้างสิ'],
      ['ถามอีกทีป้าไม่ขายจริง ๆ นะ! เตือนครั้งสุดท้าย', 'พอได้แล้ว! ถามซ้ำอีกครั้งเดียว ป้าเลิกขายเลย'],
      ['บอกแล้วใช่ไหม! ไม่ขายแล้ว ไปเลยไป!', 'พอกันที! ถามวนอยู่ได้ ไปซื้อที่อื่นเถอะ!'],
    ],
  },
  en: {
    rude: ["Hey, watch your mouth! Now it's {price}.", "Wow, rude. Fine, {price}. Take it or leave it."],
    lowball: ['{offer} baht? Go pick them off the tree yourself!', "{offer}? That doesn't even cover my gas."],
    acceptOffer: ["Ugh, fine. {price}. So, you want 'em?", "Okay, okay, {price}. Do we have a deal?", "Alright, {price}. Want 'em?"],
    deal: ["Deal. {price} a kilo. I'll pick out the good ones for you.", "{price} it is! You'll be back for more, trust me."],
    counter: [
      "{offer} is too low. I can do {price}. That's already a deal.",
      "You're tough! {price}. Any lower and I'm losing money.",
      '{offer}? Nah. Best I can do is {price}.',
      "At {offer} I lose money. {price} is me being nice.",
      "For {offer} I'll just sell to the next guy. {price}?",
    ],
    soften: [
      "Aw, you're sweet. Fine, {price}.",
      "Okay, you seem serious. {price} for you.",
      "Smooth talker... okay, {price}. Don't tell anybody.",
      'You remind me of my grandson. {price}, just for you.',
    ],
    grumble: [
      "Just 'cheaper'? Give me a reason. It's {price}.",
      "Mangoes this good for {price}? That's already cheap.",
      "Smell that! {price} is a steal.",
      "Everybody says 'cheaper'. How many kilos you want? It's {price}.",
      'Same question, same answer: {price}.',
    ],
    floor: ["{price} is really as low as I go. Any lower and I don't eat tonight."],
    chat: ["Aw, thanks! They really are sweet. How many kilos are you thinking?", "Oh, that's nice. Take a look, pick whichever you like.", "Haha, I hear you. Just tell me how many you need."],
    final: ["We keep going in circles. I'm tired. No sale today."],
    severe: ["With that mouth? No way I'm selling to you. Get outta here!", "Don't you talk to me like that! No sale. Go!"],
    patienceOut: ["That's it, I'm out of patience. No sale. Go buy somewhere else.", "I'm done. Seriously, I'm done. No sale today."],
    repeat: [
      ["You just asked me that. Same answer: {price}.", 'Asking again gets you the same answer. {price}.'],
      ["Again? Come on, say something new.", "I've heard that already. Got anything else?"],
      ["Ask me that one more time and I'm not selling. Last warning.", "Okay, stop. One more time and we're done."],
      ["I warned you. That's it, no sale. Go on!", "Enough! Same question over and over. Go buy somewhere else!"],
    ],
  },
};

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Prefer a line she hasn't said yet this conversation.
function freshLine(options, vars, history) {
  const said = new Set(history.filter((h) => h.role === 'npc').map((h) => h.text));
  const lines = options.map((o) => fill(o, vars));
  const unused = lines.filter((l) => !said.has(l));
  return pick(unused.length ? unused : lines);
}
const fill = (s, v) => s.replace(/\{(\w+)\}/g, (_, k) => v[k]);

function parseQty(text) {
  const m = text.match(RE.qty);
  if (!m) return { qty: 0 };
  const raw = m[1].toLowerCase();
  const qty = NUM_WORDS[raw] ?? parseFloat(raw);
  return { qty };
}

export const patienceOutLine = (lang, history = []) => freshLine(LINES[lang].patienceOut, {}, history);
export const chatLine = (lang, history = []) => freshLine(LINES[lang].chat, {}, history);

export function offlineReply({ cfg, message, state, history = [], repeatLvl = 0 }) {
  const lang = state.lang;
  const L = LINES[lang];
  const { qty } = parseQty(message);
  const offer = playerOffer(message, cfg.maxPrice);
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
    mood = 'stressed';
    key = 'lowball';
  } else if (offer != null && offer >= price) {
    // offering the asking price (or more) and saying yes = sale; otherwise she asks to confirm
    closed = saysYes(message);
    mood = 'happy';
    key = closed ? 'deal' : 'acceptOffer';
  } else if (offer != null) {
    const step = Math.min(7, 1 + polite + charm + reason * 2 + (qty >= 3 ? 2 : qty >= 2 ? 1 : 0));
    const willing = Math.max(cfg.floorPrice, price - step);
    if (offer >= willing) {
      // she agrees to their price but the buyer still has to confirm
      price = offer;
      mood = 'happy';
      key = 'acceptOffer';
    } else {
      price = willing;
      mood = step >= 6 ? 'happy' : price - offer > 20 ? 'stressed' : 'neutral';
      key = price === cfg.floorPrice ? 'floor' : 'counter';
    }
  } else if (saysYes(message)) {
    closed = true;
    mood = 'happy';
    key = 'deal';
  } else if (!asksForDiscount(message, cfg.maxPrice)) {
    // just chatting: be friendly, but no discount until they ask
    mood = charm || polite ? 'happy' : 'neutral';
    key = 'chat';
  } else if (polite || charm || reason || qty >= 2) {
    price = Math.max(cfg.floorPrice, price - Math.min(5, 1 + polite + charm + reason + (qty >= 3 ? 1 : 0)));
    mood = charm ? 'happy' : 'neutral';
    key = price === cfg.floorPrice ? 'floor' : 'soften';
  } else {
    key = 'grumble';
  }

  let failed = false;
  // insults end it at once, even if the words repeat something said before
  if (repeatLvl > 0 && !saysYes(message) && !RE.severe.test(message)) {
    const level = repeatLvl;
    return {
      detected_language: lang,
      npc_response: freshLine(L.repeat[level - 1], { price: state.price }, history),
      npc_mood: level >= 3 ? 'angry' : 'stressed',
      current_price: state.price,
      deal_closed: false,
      deal_failed: level >= 4,
      patience_change: -(5 + 5 * level),
    };
  }
  if (RE.severe.test(message)) {
    closed = false;
    failed = true;
    mood = 'angry';
    key = 'severe';
  }

  return {
    detected_language: lang,
    npc_response: freshLine(L[key], { price, offer }, history),
    npc_mood: mood,
    current_price: price,
    deal_closed: closed,
    deal_failed: failed,
    // rough guess of how the message felt to her
    patience_change: failed ? -100 : key === 'rude' ? -18 : key === 'lowball' ? -8 : key === 'grumble' ? -2
      : Math.min(12, 1 + polite * 4 + charm * 5 + reason * 3),
  };
}
