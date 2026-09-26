import { createScene } from './scene.js';
import { sfx } from './audio.js';

const $ = (id) => document.getElementById(id);
const els = {
  screen: $('screen'),
  moodVal: $('moodVal'),
  priceVal: $('priceVal'),
  priceBox: $('priceVal').parentElement,
  pricePop: $('pricePop'),
  turnVal: $('turnVal'),
  timerBar: $('timerBar'),
  patiencePop: $('patiencePop'),
  npcBubble: $('npcBubble'),
  npcText: $('npcText'),
  playerBubble: $('playerBubble'),
  playerText: $('playerText'),
  form: $('chatForm'),
  input: $('chatInput'),
  sendBtn: $('sendBtn'),
  micBtn: $('micBtn'),
  toast: $('toast'),
  log: $('logPanel'),
  overlay: $('overlay'),
  modeNote: $('modeNote'),
  wallet: $('walletVal'),
  nametag: document.querySelector('.nametag'),
};

/* ---------------- Text (UI follows the language the player types in) ---------------- */

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Same rule as the server: English mode = no Thai letters; Thai mode = must contain Thai.
function matchesLanguage(text, lang) {
  const thai = (text.match(/[\u0E00-\u0E3E\u0E40-\u0E7F]/g) || []).length; // Thai script, but not the \u0E3F sign (U+0E3F)
  const latin = (text.match(/[A-Za-z]/g) || []).length;
  return lang === 'en' ? thai === 0 : thai > 0 || latin === 0;
}

// Several variants per scripted line so the vendor never sounds canned.
const T = {
  th: {
    mood: 'อารมณ์แม่ค้า:',
    price: 'ราคาปัจจุบัน:',
    patience: 'ความอดทนของแม่ค้า',
    chat: 'พิมพ์แชท:',
    placeholder: 'พิมพ์ต่อราคาได้เลย',
    moods: { neutral: 'เฉยๆ', happy: 'ดีใจ', angry: 'โกรธ', stressed: 'หงุดหงิด', confused: 'งง' },
    greet: (p) => pick([
      `มะม่วงน้ำดอกไม้กิโลละ ${p} บาทจ้ะ พ่อหนุ่ม ราคานี้ลดไม่ได้แล้วน้า`,
      `เอามะม่วงไหมจ๊ะ หวานฉ่ำ เพิ่งเก็บจากสวนเมื่อเช้า กิโลละ ${p} เท่านั้น`,
      `มาแล้วเหรอ ยืนดูตั้งนาน จะเอากี่โลล่ะ? กิโลละ ${p} บาท`,
      `ร้อนก็ร้อน... เอามะม่วงไปกินให้ชื่นใจไหมหลาน กิโลละ ${p} ไม่แพงหรอก`,
    ]),
    // What she does while you keep her waiting, picked at random like a real person (p = price)
    idle: {
      nudge: [
        () => 'ว่าไงจ๊ะ จะเอากี่โลดี?',
        () => 'คิดนานจังนะ ลองจับดูก็ได้ นิ่ม ๆ หอม ๆ ทุกลูก',
        () => 'เลือกไม่ถูกเหรอลูก ป้าช่วยเลือกให้ไหม?',
      ],
      busy: [
        () => 'เฮ้อ งั้นป้าจัดลังไปก่อนนะ คิดได้แล้วเรียก',
        () => 'ป้าขอนั่งพักขาหน่อยนะ ปวดเข่าจริง ๆ',
        () => 'แมลงวันตอมอีกแล้ว... ไป๊ ๆ! เออ ว่าไงพ่อหนุ่ม',
        () => 'ร้อนจังเลย ป้าพัดวีไปก่อนนะ ตัดสินใจได้แล้วบอก',
      ],
      freebie: [
        () => 'ถ้าซื้อตอนนี้ ป้าแถมลูกเล็กให้อีกลูกเลย เอาไหม?',
        () => 'เอาเลยดีกว่าลูก ป้าเลือกลูกสวย ๆ ให้เอง',
      ],
      sweeten: [
        (p) => `เอางี้ ตัดสินใจตอนนี้ ป้าลดให้เหลือ ${p} ละกัน`,
        (p) => `วันนี้ขายไม่ค่อยดี เอาไป ${p} ก็ได้ แต่ต้องซื้อเลยนะ`,
      ],
      raise: [
        (p) => `ยืนเหม่ออะไรล่ะ ป้าไม่ได้ว่างทั้งวันนะ คิดนานก็ ${p} บาทไปเลย`,
        (p) => `เงียบแบบนี้ป้าถือว่าไม่รีบนะ งั้นราคาขึ้นเป็น ${p} บาท`,
        (p) => `นี่มาซื้อหรือมาหลบแดดจ๊ะ? ${p} บาทแล้วนะ`,
      ],
      packup: [
        () => 'ป้าเริ่มเก็บของแล้วนะ ถ้าจะซื้อก็รีบหน่อย',
        () => 'เดี๋ยวป้าจะปิดร้านแล้วนะ จะเอาไม่เอาว่ามา',
      ],
    },
    // How it ends when her patience runs out, also random (line = what she says, msg = result screen)
    endings: [
      { line: 'ไป๊! ไม่ซื้อก็ไปให้พ้น ป้าไม่ขายให้แล้ว!', msg: 'แม่ค้าหมดความอดทน เลยไล่ไปแล้ว' },
      { line: 'พอแล้ว ป้าเก็บร้านกลับบ้านดีกว่า วันนี้ไม่ขายแล้ว', msg: 'แม่ค้าเก็บร้านกลับบ้านไปแล้ว' },
      { line: 'ฮัลโหล ไอ้ตี๋เหรอลูก... เออ ๆ ป้าว่างแล้ว ลูกค้าคนนี้คงไม่ซื้อหรอก', msg: 'แม่ค้าหันไปคุยโทรศัพท์กับหลาน ไม่สนใจคุณแล้ว' },
      { line: 'เฮ้อ วันนี้ป้าเหนื่อยแล้ว พรุ่งนี้ค่อยมาใหม่นะ', msg: 'แม่ค้าบอกให้มาใหม่พรุ่งนี้' },
    ],
    kicked: 'ดีลล่ม!',
    patienceMsg: 'แม่ค้าหมดความอดทนแล้ว ลองพูดให้ถูกใจแม่ค้ามากกว่านี้นะ',
    insultMsg: 'พูดจาไม่ดีกับแม่ค้า เลยไม่ขายให้แล้ว',
    repeatMsg: 'ถามคำเดิมซ้ำจนแม่ค้ารำคาญ เลยไม่ขายแล้ว',
    wallet: (b, kg, total) => `งบ ${b}฿ · ${kg} กก. = ${total}฿`,
    mission: (b, kg) => `ภารกิจ: คุณมีเงิน <b>${b} บาท</b> ต้องซื้อมะม่วง <b>${kg} กิโล</b> (ต้องได้ไม่เกิน ${Math.floor(b / kg)}฿/กก.)`,
    missionToast: (b, kg) => `💰 มีเงิน ${b}฿ ต้องซื้อ ${kg} กก. ต่อให้อยู่ในงบ!`,
    broke: 'เงินไม่พอ!',
    brokeMsg: (total, b) => `ตกลงราคากันแล้ว รวม ${total}฿ แต่คุณมีแค่ ${b}฿... จ่ายไม่ไหว!`,
    leftover: (m) => `เหลือเงิน ${m} บาท`,
    netError: '(สัญญาณหาย... ข้อความยังอยู่ในช่องแชท ลองส่งอีกครั้งนะ)',
    fallback: 'AI ไม่ตอบ ตอนนี้ใช้โหมดสำรองชั่วคราว',
    rateLimited: 'ส่งถี่เกินไป รอสักครู่นะ',
    wrongLang: 'โหมดภาษาไทย: พิมพ์เป็นภาษาไทยเท่านั้นนะ',
    micLabel: 'กดแล้วพูด',
    listeningPlaceholder: 'กำลังฟัง... พูดได้เลย',
    micUnsupported: 'เบราว์เซอร์นี้ยังไม่รองรับการพูด ลองใช้ Chrome, Edge หรือ Safari นะ',
    micDenied: 'ต้องอนุญาตให้ใช้ไมโครโฟนก่อนนะ',
    micNoSpeech: 'ไม่ได้ยินเสียงเลย ลองพูดอีกครั้งนะ',
    micError: 'ไมโครโฟนมีปัญหา ลองอีกครั้งนะ',
    micMissing: 'ไม่พบไมโครโฟน เสียบไมค์หรือเปิดสิทธิ์ก่อนนะ',
    // What she says when the player keeps typing in another language (index = strike - 1)
    // She can't understand the player. (p = price, n = a number she did catch, if any)
    wrongLangLines: [
      (p, n) => (n ? `${n}? เอ่อ... ${n} อะไรนะ ป้าฟังออกแค่ตัวเลขอะ นอกนั้นไม่รู้เรื่องเลย` : pick([
        'ฮะ? พูดอะไรนะ... ภาษาอะไรน่ะ ป้าฟังไม่ออกเลย',
        'เอ๊ะ... ภาษาไหนเนี่ย ป้าไม่เคยได้ยินเลย พูดไทยได้ไหมจ๊ะ',
        'อะไรนะลูก? ป้าฟังไม่รู้เรื่องสักคำ',
      ])),
      (p, n) => (n ? `${n} เหรอ? โน ๆ ไม่ได้ ๆ... ที่เหลือป้าไม่รู้เรื่องเลย พูดไทยสิ` : pick([
        'ป้าก็อยากเข้าใจนะ แต่ไม่รู้ว่าภาษาอะไร ชี้เอาก็ได้ลูก',
        'ไม่รู้ภาษาไหนเลย ป้างงไปหมดแล้ว ลองพูดไทยดูสิ',
        'ในตลาดนี้ไม่มีใครฟังภาษานี้ออกหรอก พูดไทยเถอะนะ',
      ])),
      () => pick([
        'พูดยาวแบบนี้ป้ายิ่งงงเข้าไปใหญ่! พูดไทยมาเถอะ ป้าขอร้อง',
        'เฮ้อ ป้าเริ่มปวดหัวแล้วนะ คุยกันไม่รู้เรื่องเลย',
      ]),
      (p) => `เสียเวลาขายของป้าแล้วนะ! งั้นกิโลละ ${p} ไปเลย อยากต่อก็พูดไทยมา`,
      (p) => `${p} บาท! ถ้ายังพูดภาษาที่ป้าไม่รู้เรื่องอีก ป้าไม่ขายแล้วนะ`,
    ],
    wrongLangKick: 'ไม่ไหวแล้ว ๆ คุยกันไม่รู้เรื่อง ไปหาคนแปลมาก่อนแล้วค่อยมาซื้อนะ!',
    langKickedMsg: 'คุยกันไม่รู้เรื่อง แม่ค้าเลยไม่ขายให้แล้ว',
    wrongLangHistory: '(พูดภาษาที่แม่ค้าฟังไม่ออก)',
    win: 'ดีลสำเร็จ!',
    lose: 'ดีลล่ม!',
    perKg: 'บาท/กก.',
    saved: (s) => (s > 0 ? `ประหยัดไป ${s} บาท/กก.` : 'ไม่ได้ลดเลยสักบาท'),
    turns: (t) => `คุยไป ${t} ข้อความ`,
    loseMsg: 'แม่ค้าไม่ขายแล้ว ลองใช้วาทศิลป์แบบใหม่ดูนะ',
    again: 'เล่นอีกครั้ง',
    share: 'แชร์ผลลัพธ์',
    copied: 'คัดลอกผลลัพธ์แล้ว ส่งให้เพื่อนได้เลย!',
    grades: { S: 'เซียนต่อราคา', A: 'นักเจรจาตัวยง', B: 'พอใช้ได้', C: 'ป้าได้กำไรเห็นๆ' },
    shareText: (p, s, m) => `ฉันต่อมะม่วงกับแม่ค้าสมศรีได้เหลือ ${p}฿/กก. (ลดไป ${s}฿) เหลือเงินในงบ ${m}฿ ลองมาต่อให้ถูกกว่านี้ดูสิ!`,
    log: 'บันทึกการเจรจา',
    logEmpty: 'ยังไม่มีบทสนทนา',
    you: 'คุณ',
    vendor: 'แม่ค้าสมศรี',
    vendorName: 'แม่ค้าสมศรี',
    hints: [
      'พูดจาสุภาพ มีหางเสียง แม่ค้าจะใจอ่อนง่ายขึ้น',
      'ลองให้เหตุผล เช่น ร้านอื่นถูกกว่า หรือเป็นนักศึกษางบน้อย',
      'ซื้อเหมาหลายกิโล มีโอกาสได้ส่วนลดมากขึ้น',
      'ชวนคุยเรื่องอื่นบ้าง สร้างความสนิทก่อนค่อยต่อราคา',
      'ต่อราคาต่ำเกินไป แม่ค้าจะหงุดหงิดและไม่ลดให้',
      'ใช้มุกเดิมซ้ำ ๆ ไม่ได้ผลนะ แม่ค้าจำได้',
      'ดูแถบความอดทนไว้ พูดดีมันจะเพิ่ม กวนใจหรือเงียบนานมันจะลด ถ้าหมดโดนไล่!',
      'แม่ค้าไม่รู้ว่าคุณมีเงินเท่าไร ลองบอกงบของคุณดูสิ',
    ],
  },
  en: {
    mood: 'Mood:',
    price: 'Price:',
    patience: 'Patience',
    chat: 'Chat',
    placeholder: 'Type your message...',
    moods: { neutral: 'Neutral', happy: 'Happy', angry: 'Angry', stressed: 'Annoyed', confused: 'Confused' },
    greet: (p) => pick([
      `Mangoes! ${p} baht a kilo. That's already a good price.`,
      `Fresh mangoes, picked this morning. ${p} a kilo.`,
      `You've been staring for a while. How many kilos? ${p} each.`,
      `Hot out today, huh? Grab some mangoes. Just ${p} a kilo.`,
    ]),
    idle: {
      nudge: [
        () => 'So, how many kilos are we talking?',
        () => "Go ahead, feel 'em. Nice and ripe, every one.",
        () => "Can't decide? Want me to pick some for you?",
      ],
      busy: [
        () => "Alright, I'll sort these crates while you think.",
        () => 'Mind if I sit down? My knees are killing me.',
        () => 'Ugh, these flies... Shoo! Sorry, where were we?',
        () => "Whew, it's hot. I'll just fan myself while you decide.",
      ],
      freebie: [
        () => "Buy now and I'll throw in a small one for free.",
        () => "Just go for it. I'll pick out the nicest ones myself.",
      ],
      sweeten: [
        (p) => `Tell you what, decide now and it's ${p}.`,
        (p) => `Slow day... ${p} if you buy right now.`,
      ],
      raise: [
        (p) => `Take your time, but it'll cost you. ${p} baht now.`,
        (p) => `I've got stuff to do, you know. ${p} now.`,
        (p) => `Are you buying or just hiding from the sun? ${p} now.`,
      ],
      packup: [
        () => "I'm starting to pack up. If you want 'em, hurry.",
        () => "I'm closing soon. Yes or no?",
      ],
    },
    endings: [
      { line: "Okay, that's it. If you're not buying, move along. No sale!", msg: 'Som Sri ran out of patience and sent you away.' },
      { line: "That's enough for today. I'm packing up and going home.", msg: 'Som Sri packed up her stall and went home.' },
      { line: "Hello? Oh, hi sweetie! Yeah, I'm free now, this customer isn't buying anyway.", msg: 'Som Sri took a phone call and forgot about you.' },
      { line: "I'm tired today. Come back tomorrow, okay?", msg: 'Som Sri told you to come back tomorrow.' },
    ],
    kicked: 'GAME OVER',
    patienceMsg: 'Som Sri ran out of patience. Try being easier to deal with!',
    insultMsg: 'You insulted Som Sri, so she refused to sell.',
    repeatMsg: 'You kept asking the same thing until she gave up.',
    wallet: (b, kg, total) => `Budget ${b}฿ · ${kg} kg = ${total}฿`,
    mission: (b, kg) => `OBJECTIVE: Buy <b>${kg} kg</b> of mangoes with <b>${b}฿</b> (${Math.floor(b / kg)}฿/kg or less).`,
    missionToast: (b, kg) => `🎯 OBJECTIVE: Buy ${kg} kg with ${b}฿`,
    broke: 'GAME OVER',
    brokeMsg: (total, b) => `Not enough money. The deal costs ${total}฿, but your budget is ${b}฿.`,
    leftover: (m) => `Money left: ${m}฿`,
    netError: 'Connection error. Please try again.',
    fallback: 'AI is busy. Switched to offline mode.',
    rateLimited: 'Too many messages. Please wait a moment.',
    wrongLang: 'English mode: please type in English only.',
    micLabel: 'Tap to talk',
    listeningPlaceholder: 'Listening... go ahead',
    micUnsupported: "Voice input isn't supported in this browser. Try Chrome, Edge or Safari.",
    micDenied: 'Please allow microphone access.',
    micNoSpeech: "Didn't catch that. Try again.",
    micError: 'Microphone error. Please try again.',
    micMissing: 'No microphone found. Plug one in or check permissions.',
    wrongLangLines: [
      (p, n) => (n ? `${n}? I got the number, but that's it. Can you say it in English?` : pick([
        "Sorry, what? What language is that? I didn't get a word.",
        "Huh? I have no idea what you just said. English, maybe?",
        "Wait, what? I can't even tell what language that is.",
      ])),
      (p, n) => (n ? `${n}? No, no... I think? I honestly can't tell what you're saying.` : pick([
        "I really wish I understood. Maybe just point at what you want?",
        "Nope, still nothing. I don't know what language that is.",
        "Nobody around here speaks that, whatever it is. English, please?",
      ])),
      () => pick([
        "Okay, I'm lost. I can't help you if I can't understand you.",
        'Man, this is hard. English, please. Anything!',
      ]),
      (p) => `Look, I've got other customers. It's ${p} now. Come back when you can say it in English.`,
      (p) => `${p}. Last try. If I still can't understand you, I'm done.`,
    ],
    wrongLangKick: 'Sorry, I give up. Bring a friend who speaks English and come back later!',
    langKickedMsg: "She couldn't understand you, so she gave up on the sale.",
    wrongLangHistory: '(said something Som Sri could not understand)',
    win: 'YOU WIN!',
    lose: 'GAME OVER',
    perKg: '฿/kg',
    saved: (s) => (s > 0 ? `Discount: ${s}฿/kg` : 'Discount: none'),
    turns: (t) => `Messages: ${t}`,
    loseMsg: 'The deal failed. Try a different strategy!',
    again: 'PLAY AGAIN',
    share: 'SHARE',
    copied: 'Copied to clipboard!',
    grades: { S: 'Master Haggler', A: 'Great Deal', B: 'Good Deal', C: 'Fair Deal' },
    shareText: (p, s, m) => `I got Auntie Som Sri's mangoes down to ${p}฿ a kilo (${s}฿ off) and still had ${m}฿ left. Think you can beat that?`,
    log: 'Chat Log',
    logEmpty: 'No messages yet',
    you: 'You',
    vendor: 'Som Sri',
    vendorName: 'Auntie Som Sri',
    hints: [
      'TIP: Being polite gets you better prices.',
      'TIP: Give a good reason, like a cheaper stall nearby or a tight budget.',
      'TIP: Buy more kilos for a bigger discount.',
      'TIP: Build rapport before asking for a lower price.',
      'TIP: Lowball offers only annoy her.',
      "TIP: She remembers everything. Tricks won't work twice.",
      'TIP: Watch her patience bar. Being nice raises it; silence and annoying her drain it.',
      "TIP: She doesn't know your budget. Try telling her.",
    ],
  },
};

/* ---------------- State ---------------- */

// Each game the player gets a random wallet and shopping list (budget / kg = the price they must reach).
const MISSIONS = [
  { kg: 3, budget: 300 }, // <= 100/kg
  { kg: 2, budget: 200 }, // <= 100/kg
  { kg: 4, budget: 380 }, // <= 95/kg
  { kg: 2, budget: 185 }, // <= 92/kg
  { kg: 5, budget: 450 }, // <= 90/kg
];
const pickMission = () => MISSIONS[Math.floor(Math.random() * MISSIONS.length)];

const cfg = { startPrice: 120, idleSeconds: 25, maxPrice: 150, provider: 'offline', model: null };
const S = {
  started: false,
  over: false,
  busy: false,
  typing: false,
  lang: 'en', // English first; the player can switch to Thai on the title screen
  price: 120,
  mood: 'neutral',
  turn: 0,
  history: [],
  idleLeft: 25,
  wrongLang: 0,
  patience: 100,
  lastKeyAt: 0,
  lastIdle: null,
  sweetened: false,
  endMsg: null,
  mission: MISSIONS[0],
  gen: 0, // bumps on every (re)start so stale async replies are ignored
};
const L = () => T[S.lang];

const scene = createScene($('scene'));

/* ---------------- HUD ---------------- */

function applyLang() {
  document.documentElement.lang = S.lang;
  $('lblMood').textContent = L().mood;
  $('lblPrice').textContent = L().price;
  $('lblChat').textContent = L().chat;
  els.nametag.textContent = L().vendorName;
  els.micBtn.title = L().micLabel;
  els.micBtn.setAttribute('aria-label', L().micLabel);
  renderWallet();
  els.input.placeholder = L().placeholder;
  setMood(S.mood);
  renderTurn();
}

function setMood(mood) {
  S.mood = mood;
  els.moodVal.textContent = L().moods[mood];
  els.moodVal.dataset.mood = mood;
  scene.setMood(mood);
}

function renderTurn() {
  els.turnVal.textContent = L().patience;
}

function renderWallet() {
  const { kg, budget } = S.mission;
  const total = S.price * kg;
  els.wallet.textContent = L().wallet(budget, kg, total);
  els.wallet.dataset.state = total <= budget ? 'ok' : 'over';
}

function setPrice(next, { silent = false } = {}) {
  const diff = next - S.price;
  S.price = next;
  els.priceVal.textContent = `${next}฿`;
  renderWallet();
  if (!diff || silent) return;
  els.priceBox.classList.remove('flash-down', 'flash-up');
  els.pricePop.className = 'price-pop';
  void els.priceBox.offsetWidth; // restart CSS animations
  const down = diff < 0;
  els.priceBox.classList.add(down ? 'flash-down' : 'flash-up');
  els.pricePop.textContent = `${down ? '' : '+'}${diff}฿`;
  els.pricePop.classList.add('show', down ? 'down' : 'up');
  down ? sfx.priceDown() : sfx.priceUp();
}

let toastTimer;
function toast(msg, ms = 2600) {
  els.toast.textContent = msg;
  els.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove('show'), ms);
}

/* ---------------- Bubbles ---------------- */

const segmenter = 'Segmenter' in Intl ? new Intl.Segmenter('th', { granularity: 'grapheme' }) : null;
const graphemes = (s) => (segmenter ? [...segmenter.segment(s)].map((g) => g.segment) : [...s]);

let typeTimer = null;
let typeResolve = null;
let typeFull = '';

function typeNpc(text) {
  finishTyping();
  els.npcBubble.classList.remove('system');
  els.npcText.classList.remove('dots');
  const chars = graphemes(text);
  typeFull = text;
  S.typing = true;
  scene.setTalking('npc', true);
  let i = 0;
  els.npcText.textContent = '';
  return new Promise((resolve) => {
    typeResolve = resolve;
    typeTimer = setInterval(() => {
      i += 1;
      els.npcText.textContent = chars.slice(0, i).join('');
      if (i % 2 === 0 && chars[i - 1] !== ' ') sfx.blip();
      if (i >= chars.length) finishTyping();
    }, 18);
  });
}

function finishTyping() {
  if (!typeTimer) return;
  clearInterval(typeTimer);
  typeTimer = null;
  els.npcText.textContent = typeFull;
  S.typing = false;
  scene.setTalking('npc', false);
  typeResolve?.();
  typeResolve = null;
}

function showThinking() {
  finishTyping();
  els.npcBubble.classList.remove('system');
  els.npcText.textContent = '';
  els.npcText.classList.add('dots');
}

function showSystem(text) {
  els.npcText.classList.remove('dots');
  els.npcBubble.classList.add('system');
  els.npcText.textContent = text;
}

function renderPlayerBubble(text, withCaret) {
  els.playerText.textContent = text;
  if (withCaret) {
    const caret = document.createElement('span');
    caret.className = 'caret';
    els.playerText.append(caret);
  }
  els.playerBubble.classList.toggle('hidden', !text && !withCaret);
  els.playerText.scrollTop = els.playerText.scrollHeight;
}

async function npcSay(text) {
  S.history.push({ role: 'npc', text });
  renderLog();
  await typeNpc(text);
}

/* ---------------- Patience ---------------- */

// One meter (0-100) like a real person's patience. It drains while you're silent or typing
// without sending, drops when you annoy her, grows a little when you're nice, and at 0 she
// sends you away. It pauses while she's talking or listening to you.
const PATIENCE_DRAIN = 0.75; // per second of silence (100 -> 0 in about 130 s)
// While you're actively typing she waits more patiently: everything runs at about a third of the speed.
const TYPING_SLOWDOWN = 0.35;
const TYPING_GRACE_MS = 4000; // counts as "typing" if a key was pressed in the last 4 s
const IDLE_RAISE = 5; // every idleSeconds of silence she grumbles and adds 5 baht

function setPatience(next, { silent = false } = {}) {
  const value = Math.max(0, Math.min(100, next));
  const diff = Math.round(value) - Math.round(S.patience);
  S.patience = value;
  els.timerBar.style.width = `${value}%`;
  els.timerBar.dataset.level = value <= 25 ? 'low' : value <= 55 ? 'mid' : 'ok';
  if (silent || Math.abs(diff) < 2) return;
  els.patiencePop.className = 'patience-pop';
  void els.patiencePop.offsetWidth; // restart the animation
  els.patiencePop.textContent = `${diff > 0 ? '+' : ''}${diff}`;
  els.patiencePop.classList.add('show', diff > 0 ? 'up' : 'down');
}

let lastTick = performance.now();
setInterval(() => {
  const now = performance.now();
  const dt = (now - lastTick) / 1000;
  lastTick = now;
  const running = S.started && !S.over && !S.busy && !S.typing && !listening && !document.hidden && els.log.classList.contains('hidden');
  document.querySelector('.timer').classList.toggle('paused', !running);
  if (!running) return;

  const typingNow = els.input.value.trim() !== '' && now - S.lastKeyAt < TYPING_GRACE_MS;
  const rate = typingNow ? TYPING_SLOWDOWN : 1;
  const before = Math.ceil(S.patience);
  setPatience(S.patience - PATIENCE_DRAIN * rate * dt, { silent: true });
  if (S.patience <= 10 && Math.ceil(S.patience) !== before) sfx.tick();
  if (S.patience <= 0) return runOutOfPatience();

  S.idleLeft = Math.max(0, S.idleLeft - rate * dt);
  if (S.idleLeft <= 0) onIdle();
}, 100);

function resetIdle() {
  S.idleLeft = cfg.idleSeconds;
}

// Silence: every idleSeconds she does something, like a real vendor would. What she does is
// random but depends on how much patience she has left, and she doesn't do the same thing twice in a row.
function pickIdleReaction() {
  const p = S.patience;
  const canSweeten = !S.sweetened && S.price >= 95; // a "decide now" discount, once per game
  const weights = p > 60
    ? { nudge: 3, busy: 3, freebie: 2, sweeten: canSweeten ? 2 : 0, raise: 0.5, packup: 0 }
    : p > 30
      ? { nudge: 2, busy: 2, freebie: 1.5, sweeten: canSweeten ? 1.5 : 0, raise: 1.5, packup: 1 }
      : { nudge: 1, busy: 1, freebie: 0.5, sweeten: 0, raise: 1.5, packup: 3 };
  if (S.lastIdle) weights[S.lastIdle] = 0;
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (const [kind, w] of Object.entries(weights)) {
    if ((r -= w) < 0) return kind;
  }
  return 'raise';
}

async function onIdle() {
  if (S.busy) return;
  resetIdle();
  if (S.patience < 8) return; // she's about to give up anyway; don't bump the price a second before
  const kind = pickIdleReaction();
  S.lastIdle = kind;
  const moods = { nudge: 'neutral', busy: 'neutral', freebie: 'happy', sweeten: 'happy', raise: 'stressed', packup: 'stressed' };
  if (kind === 'raise') setPrice(Math.min(S.price + IDLE_RAISE, cfg.maxPrice));
  if (kind === 'sweeten') {
    S.sweetened = true;
    setPrice(S.price - (2 + Math.floor(Math.random() * 2))); // -2 or -3 baht
  }
  setMood(S.patience <= 25 && kind === 'raise' ? 'angry' : moods[kind]);
  if (kind === 'raise' || kind === 'packup') sfx.angry();
  const lines = L().idle[kind];
  await npcSay(pick(lines)(S.price));
  resetIdle();
}

async function runOutOfPatience(line, msg) {
  if (S.over) return;
  if (!line) ({ line, msg } = pick(L().endings)); // how she gives up is random too
  S.over = true; // no escaping by typing while she sends you away
  S.endMsg = msg;
  setInputEnabled(false);
  setPatience(0);
  setMood('angry');
  sfx.angry();
  const gen = S.gen;
  await npcSay(line);
  if (gen === S.gen) endGame('kicked');
}

/* ---------------- Wrong language ---------------- */

// Typing in the other language never reaches the AI. Som Sri reacts on the spot:
// confused (1-2), annoyed (3), angry + price up (4-5), then refuses to sell (6).
async function onWrongLanguage(text) {
  const gen = S.gen;
  S.busy = true;
  setInputEnabled(false);
  els.input.value = '';
  renderPlayerBubble(text, false);
  scene.hop();
  S.wrongLang += 1;
  resetIdle();
  const lines = L().wrongLangLines;
  const n = S.wrongLang;
  showThinking();
  await new Promise((r) => setTimeout(r, 500 + Math.random() * 500));
  if (gen !== S.gen) return;
  if (n === 1) toast(L().wrongLang, 3000);
  setPatience(S.patience - [8, 10, 14, 18, 24][Math.min(n, 5) - 1]);
  if (S.patience <= 0 || n > lines.length) {
    S.busy = false;
    return runOutOfPatience(L().wrongLangKick, L().langKickedMsg);
  }
  if (n <= 2) {
    setMood('confused');
  } else if (n === 3) {
    setMood('stressed');
  } else {
    setMood('angry');
    sfx.angry();
    setPrice(Math.min(S.price + 5, cfg.maxPrice));
  }
  S.history.push({ role: 'player', text: L().wrongLangHistory });
  const heardNumber = text.match(/\d+/)?.[0];
  await npcSay(lines[n - 1](S.price, heardNumber));
  if (gen !== S.gen) return;
  S.busy = false;
  resetIdle();
  if (!S.over) {
    setInputEnabled(true);
    els.input.focus();
  }
}

/* ---------------- Sending a message ---------------- */

function setInputEnabled(on) {
  els.input.disabled = !on;
  els.sendBtn.disabled = !on;
  els.micBtn.disabled = !on;
  if (!on) stopListening(true);
}

async function send() {
  const text = els.input.value.trim();
  if (!S.started || S.over || S.busy || !text) return;
  if (!matchesLanguage(text, S.lang)) return onWrongLanguage(text);

  const gen = S.gen;
  S.busy = true;
  S.turn += 1;
  resetIdle();
  renderTurn();
  setInputEnabled(false);
  renderPlayerBubble(text, false);
  scene.hop();
  sfx.send();
  showThinking();

  try {
    const res = await fetch('api/negotiate', {
      // never leave the player stuck on a hung request (older Safari has no AbortSignal.timeout)
      ...(AbortSignal.timeout ? { signal: AbortSignal.timeout(20000) } : {}),
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        message: text,
        state: { current_price: S.price, turn: S.turn, lang: S.lang, day_seed: S.daySeed, patience: Math.round(S.patience) },
        history: S.history.slice(-40),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (gen !== S.gen) return;
    if (!res.ok) throw Object.assign(new Error(data.error || `HTTP ${res.status}`), { code: data.error });
    const valid = typeof data.npc_response === 'string' && Number.isFinite(data.current_price) && data.npc_mood in L().moods;
    if (!valid) throw new Error('Unexpected reply from server');

    els.input.value = '';
    S.history.push({ role: 'player', text });
    if (data.warning === 'llm_error') toast(L().fallback);
    if (data.npc_mood === 'angry' && S.mood !== 'angry') sfx.angry();
    setMood(data.npc_mood);
    setPrice(data.current_price);
    if (typeof data.patience === 'number') setPatience(data.patience);
    await npcSay(data.npc_response);

    if (data.deal_closed) return endGame(S.price * S.mission.kg <= S.mission.budget ? 'win' : 'broke');
    if (data.deal_failed) return endGame({ insult: 'insult', repeat: 'repeat', patience: 'patience' }[data.end_reason] ?? 'lose');
  } catch (err) {
    if (gen !== S.gen) return;
    S.turn -= 1;
    renderTurn();
    if (err.code === 'wrong_language') toast(L().wrongLang, 3000);
    else showSystem(err.code === 'rate_limited' ? L().rateLimited : L().netError);
    console.error(err);
  } finally {
    if (gen === S.gen) {
      S.busy = false;
      resetIdle();
    }
    if (gen === S.gen && !S.over) {
      setInputEnabled(true);
      els.input.focus();
    }
  }
}

/* ---------------- Voice input ---------------- */

// Speech-to-text built into the browser (Chrome, Edge, Safari). Free, no API key.
// Thai mode listens for Thai (th-TH), English mode for English (en-US).
// What you say appears live in the chat box, and is sent when you stop talking.
const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognizer = null;
let listening = false;
const SILENCE_MS = 900; // pause this long after speaking and the mic closes (nothing is sent until you press Enter/SEND)
const MAX_LISTEN_MS = 15000; // her patience pauses while you talk, so one turn of talking can't last forever

function setListening(on) {
  listening = on;
  els.micBtn.classList.toggle('listening', on);
  els.micBtn.setAttribute('aria-pressed', String(on));
  els.input.placeholder = on ? L().listeningPlaceholder : L().placeholder;
}

function stopListening(discard = false) {
  if (!recognizer) return;
  try {
    if (discard) recognizer.abort();
    else recognizer.stop();
  } catch { /* already stopped */ }
  if (discard) recognizer = null; // ignore anything the old mic still sends
  setListening(false); // the button reacts right away, so a quick second tap starts a fresh session
}

function toggleListening() {
  if (listening) return stopListening();
  if (!Recognition) return toast(L().micUnsupported, 4000);
  if (!S.started || S.over || S.busy) return;

  const rec = new Recognition();
  rec.lang = S.lang === 'th' ? 'th-TH' : 'en-US';
  rec.interimResults = true;
  rec.continuous = false;
  rec.maxAlternatives = 1;
  const typedBefore = els.input.value.trim();
  const gen = S.gen;
  let heard = '';
  let done = false;
  let silenceTimer = null;

  // Nothing is sent automatically: your words wait in the chat box so you can fix them,
  // then you press Enter or SEND. We just close the mic as soon as you stop talking.
  const finish = () => {
    clearTimeout(silenceTimer);
    if (done) return;
    done = true;
    try { rec.stop(); } catch { /* already stopped (Safari throws) */ }
  };

  rec.onresult = (e) => {
    if (recognizer !== rec) return; // a mic we already shut off
    let finalText = '';
    let interim = '';
    for (const r of e.results) {
      if (r.isFinal) finalText += r[0].transcript;
      else interim += r[0].transcript;
    }
    heard = (finalText || interim).trim();
    const text = [typedBefore, heard].filter(Boolean).join(' ').slice(0, 280);
    els.input.value = text;
    // follow along as you speak: keep the newest words in view, cursor at the end
    els.input.scrollLeft = els.input.scrollWidth;
    try { els.input.setSelectionRange(text.length, text.length); } catch { /* not focused */ }
    renderPlayerBubble(text, true);
    if (finalText) return finish();
    // No new words for a moment = you've stopped talking (quicker than the browser's own wait).
    clearTimeout(silenceTimer);
    silenceTimer = setTimeout(finish, SILENCE_MS);
  };
  rec.onerror = (e) => {
    if (e.error === 'aborted') return;
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed') toast(L().micDenied, 4000);
    else if (e.error === 'no-speech') toast(L().micNoSpeech, 2500);
    else if (e.error === 'audio-capture') toast(L().micMissing, 4000);
    else toast(L().micError, 2500);
  };
  rec.onend = () => {
    clearTimeout(silenceTimer);
    clearTimeout(maxTimer);
    if (recognizer && recognizer !== rec) return; // a newer mic session is running; leave it alone
    recognizer = null;
    setListening(false);
    if (gen !== S.gen || S.over || S.busy) return;
    // Your words are in the box: count it like typing so she waits a bit, then press Enter/SEND.
    S.lastKeyAt = performance.now();
    if (heard) els.input.focus();
  };

  const maxTimer = setTimeout(finish, MAX_LISTEN_MS);
  try {
    rec.start();
    recognizer = rec;
    setListening(true);
    sfx.tick();
  } catch {
    clearTimeout(maxTimer);
    setListening(false);
    toast(L().micError, 2500);
  }
}

els.micBtn.addEventListener('click', toggleListening);

/* ---------------- Game flow ---------------- */

function grade(price) {
  if (price <= 85) return 'S';
  if (price <= 95) return 'A';
  if (price <= 105) return 'B';
  return 'C';
}

function showOverlay(html) {
  els.overlay.innerHTML = `<div class="panel">${html}</div>`;
  els.overlay.classList.remove('hidden');
}

function hideOverlay() {
  els.overlay.classList.add('hidden');
}

function showTitle() {
  stopListening(true);
  finishTyping();
  S.gen += 1;
  S.busy = false;
  S.started = false;
  S.over = false;
  S.mission = pickMission();
  setPrice(cfg.startPrice, { silent: true });
  setInputEnabled(false);
  S.screen = 'title';
  showOverlay(`
    <h1>Haggle Market</h1>
    <div class="row-btns">
      <button class="pbtn" data-lang="en">English</button>
      <button class="pbtn alt" data-lang="th">ภาษาไทย</button>
    </div>`);
}

// Full rules in the chosen language, shown before every new game from the title screen.
const RULES = {
  th: (m) => `
    <h2>กติกาการเล่น</h2>
    <p class="mission">ภารกิจ: คุณมีเงิน <b>${m.budget} บาท</b> ต้องซื้อมะม่วง <b>${m.kg} กิโล</b><br>ราคาเริ่มต้นกิโลละ ${cfg.startPrice} บาท ต้องต่อให้เหลือไม่เกิน <b>${Math.floor(m.budget / m.kg)} บาท/กก.</b></p>
    <ol>
      <li><b>พิมพ์ หรือกดปุ่มไมค์ 🎤 แล้วพูด</b> (คำที่พูดจะขึ้นในช่องแชท กด Enter หรือ SEND เพื่อส่ง) คุยได้อิสระ แม่ค้าเป็น AI ที่คิดและตอบตามสิ่งที่คุณพูดจริง ๆ (<b>พิมพ์ภาษาไทยเท่านั้น</b> ถ้าพิมพ์ภาษาอื่นแม่ค้าจะงง ถ้าบ่อย ๆ จะโกรธ)</li>
      <li><b>วิธีได้ส่วนลด:</b> พูดสุภาพ ให้เหตุผลที่น่าเชื่อ ซื้อหลายกิโล อ้อนหรือชวนคุย ใช้เทคนิคต่อรอง</li>
      <li><b>แม่ค้าจะหงุดหงิดและไม่ลดให้</b> ถ้าต่อต่ำเกินเหตุ (เช่น 10 บาท) หรือพูดไม่ดี ถ้า<b>ด่าหรือพูดหยาบคายมาก ๆ = ดีลล่มทันที!</b></li>
      <li>แม่ค้า<b>จำได้</b>ว่าคุยอะไรกันไปแล้ว ใช้มุกเดิมซ้ำไม่ได้ผล <b>ถามคำถามเดิมซ้ำ ๆ แม่ค้าจะรำคาญ ถ้ายังไม่หยุดจะดีลล่ม!</b> และแม่ค้าไม่รู้ว่าคุณมีเงินเท่าไร ถ้าคุณไม่บอก</li>
      <li><b>ความอดทนของแม่ค้า:</b> แถบด้านบนจะลดลงเรื่อย ๆ ตอนเงียบ (ระหว่างกำลังพิมพ์จะลดช้าลง แต่ไม่หยุด) และลดเมื่อต่อต่ำเกินเหตุ ถามซ้ำ พูดไม่ดี หรือพูดผิดภาษา แต่จะ<b>เพิ่มขึ้น</b>เมื่อพูดสุภาพ ให้เหตุผลดี หรือชวนคุยถูกใจ ถ้าเงียบนาน ${cfg.idleSeconds} วินาที แม่ค้าจะทำอะไรสักอย่างเหมือนคนจริง เช่น ชวนคุย ทำอย่างอื่นรอ เสนอของแถม บางทีลดให้ถ้าตัดสินใจเลย หรือบ่นแล้วขึ้นราคา <b>ความอดทนหมด = ดีลล่ม!</b></li>
      <li><b>ไม่จำกัดจำนวนข้อความ</b> คุยต่อรองได้เรื่อย ๆ จนกว่าจะตกลงกันได้ แต่ห้ามเงียบนาน!</li>
      <li><b>ชนะ:</b> ตกลงราคาได้และยอดรวมไม่เกินงบ (แม่ค้ายอมราคาแล้วต้อง<b>พิมพ์ยืนยัน</b> เช่น "ตกลง" หรือ "เอาเลย" ถึงจะซื้อ ยังไม่ยืนยันก็ต่อต่อได้) &nbsp;<b>แพ้:</b> ดีลล่ม, โดนไล่ หรือตกลงแล้วเงินไม่พอจ่าย</li>
    </ol>
    <div class="row-btns">
      <button class="pbtn alt" data-back>ย้อนกลับ</button>
      <button class="pbtn" data-start="th">เริ่มเล่น!</button>
    </div>`,
  en: (m) => `
    <h2>HOW TO PLAY</h2>
    <p class="mission"><b>OBJECTIVE:</b> Buy <b>${m.kg} kg</b> of mangoes with a budget of <b>${m.budget}฿</b>.<br>Starting price: ${cfg.startPrice}฿/kg. Target: <b>${Math.floor(m.budget / m.kg)}฿/kg</b> or less.</p>
    <ol>
      <li><b>Type, or tap the mic 🎤 and talk</b> (your words appear in the chat box; press Enter or SEND to send them), in <b>English only</b>. Som Sri is an AI and responds to what you say. Other languages confuse her, and she gets mad if you keep trying.</li>
      <li><b>Get discounts</b> by being polite, giving good reasons, buying more, or using haggling tactics.</li>
      <li><b>Lowball offers</b> and rudeness annoy her, and she won't drop the price. <b>Insults end the deal immediately.</b></li>
      <li><b>She remembers everything.</b> Repeated tricks won't work. <b>Keep asking the same thing and she gets annoyed, then ends the deal.</b> She doesn't know your budget unless you tell her.</li>
      <li><b>Patience bar:</b> it drains while you're silent (slower while you're typing, but it never stops), and drops when you lowball, repeat yourself, act rude or use the wrong language. Being polite, giving good reasons and friendly chat <b>raise</b> it. Every ${cfg.idleSeconds}s of silence she does something, like a real person: chats, keeps herself busy, offers a freebie, sometimes a small "buy now" discount, or grumbles and raises the price. <b>At zero the deal is off!</b></li>
      <li><b>No message limit.</b></li>
      <li><b>WIN:</b> close a deal within your budget. When she agrees to a price, <b>confirm</b> it ("deal", "I'll take it") to buy, or keep haggling. <b>LOSE:</b> the deal fails, you get kicked out, or you can't afford the price.</li>
    </ol>
    <div class="row-btns">
      <button class="pbtn alt" data-back>BACK</button>
      <button class="pbtn" data-start="en">START</button>
    </div>`,
};

function showRules(lang) {
  S.screen = 'rules';
  S.lang = lang;
  applyLang();
  showOverlay(`<div class="rules">${RULES[lang](S.mission)}</div>`);
}

async function startGame(lang, { newMission = false } = {}) {
  stopListening(true); // a mic left on from the last game must not type into this one
  hideOverlay();
  if (newMission) S.mission = pickMission();
  finishTyping();
  // daySeed picks a different "day at the market" for the AI each game
  Object.assign(S, { screen: 'game', started: true, over: false, busy: false, lang, turn: 0, history: [], wrongLang: 0, lastIdle: null, sweetened: false, endMsg: null, gen: S.gen + 1, daySeed: Math.floor(Math.random() * 1000) });
  setPrice(cfg.startPrice, { silent: true });
  setPatience(100, { silent: true });
  applyLang();
  setMood('neutral');
  renderPlayerBubble('', false);
  els.log.classList.add('hidden');
  renderLog();
  resetIdle();
  setInputEnabled(true);
  els.input.value = '';
  els.input.focus();
  toast(L().missionToast(S.mission.budget, S.mission.kg), 4000);
  await npcSay(L().greet(cfg.startPrice));
  resetIdle();
}

// result: 'win' | 'lose' | 'broke' (price agreed but the player can't afford it) | 'kicked' (silent too long)
function endGame(result) {
  stopListening(true);
  S.over = true;
  setInputEnabled(false);
  const saved = cfg.startPrice - S.price;
  const total = S.price * S.mission.kg;
  const gen = S.gen;
  setTimeout(() => {
    if (gen !== S.gen) return; // player already restarted: don't show the old result
    if (result === 'win') {
      sfx.win();
      const g = grade(S.price);
      showOverlay(`
        <h1>${L().win}</h1>
        <div class="result-price">${S.price}฿ <small style="font-size:.4em">${L().perKg}</small></div>
        <div class="grade">${g} · ${L().grades[g]}</div>
        <p class="stats">${L().leftover(S.mission.budget - total)} · ${L().saved(saved)} · ${L().turns(S.turn)}</p>
        <div class="row-btns">
          <button class="pbtn" data-restart>${L().again}</button>
          <button class="pbtn alt" data-share>${L().share}</button>
        </div>`);
    } else {
      sfx.lose();
      const title = { broke: L().broke, kicked: L().kicked }[result] ?? L().lose;
      const msg = { broke: L().brokeMsg(total, S.mission.budget), kicked: S.endMsg || L().patienceMsg, patience: L().patienceMsg, insult: L().insultMsg, repeat: L().repeatMsg }[result] ?? L().loseMsg;
      showOverlay(`
        <h1>${title}</h1>
        <p>${msg}</p>
        <p class="stats">${L().turns(S.turn)}</p>
        <div class="row-btns"><button class="pbtn" data-restart>${L().again}</button></div>`);
    }
  }, 1100);
}

async function share() {
  const text = `${L().shareText(S.price, cfg.startPrice - S.price, S.mission.budget - S.price * S.mission.kg)} ${location.href}`;
  try {
    if (navigator.share) await navigator.share({ text });
    else {
      await navigator.clipboard.writeText(text);
      toast(L().copied);
    }
  } catch {
    /* user cancelled */
  }
}

/* ---------------- Log ---------------- */

function renderLog() {
  const rows = S.history
    .map((h) => {
      const row = document.createElement('p');
      row.className = `row ${h.role}`;
      const who = document.createElement('span');
      who.className = 'who';
      who.textContent = `${h.role === 'npc' ? L().vendor : L().you}: `;
      row.append(who, h.text);
      return row;
    });
  const title = document.createElement('h2');
  title.textContent = L().log;
  els.log.replaceChildren(title, ...(rows.length ? rows : [Object.assign(document.createElement('p'), { className: 'empty', textContent: L().logEmpty })]));
  els.log.scrollTop = els.log.scrollHeight;
}

/* ---------------- Controls ---------------- */

const actions = {
  hint: () => {
    const hints = L().hints;
    toast(`💡 ${hints[Math.floor(Math.random() * hints.length)]}`, 3500);
  },
  restart: () => (S.started ? startGame(S.lang, { newMission: true }) : showTitle()),
  menu: showTitle,
};

els.form.addEventListener('submit', (e) => {
  e.preventDefault();
  send();
});

els.input.addEventListener('input', () => {
  if (S.busy || S.over) return;
  // typing doesn't stop her patience draining, it only slows it down (see TYPING_SLOWDOWN)
  S.lastKeyAt = performance.now();
  renderPlayerBubble(els.input.value, true);
});
// Phones: when the keyboard opens, keep the scene in view instead of scrolling it away.
els.input.addEventListener('focus', () => {
  if (window.innerWidth > 720) return;
  setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 300);
});
window.visualViewport?.addEventListener('resize', () => {
  if (window.innerWidth <= 720 && document.activeElement === els.input) window.scrollTo({ top: 0 });
});
els.input.addEventListener('blur', () => {
  if (!S.busy && !els.input.value) renderPlayerBubble('', false);
});

els.npcBubble.addEventListener('click', finishTyping);

els.overlay.addEventListener('click', (e) => {
  const pickLang = e.target.closest('[data-lang]');
  if (pickLang) showRules(pickLang.dataset.lang);
  if (e.target.closest('[data-back]')) showTitle();
  const start = e.target.closest('[data-start]');
  if (start) startGame(start.dataset.start);
  if (e.target.closest('[data-restart]')) startGame(S.lang, { newMission: true });
  if (e.target.closest('[data-share]')) share();
});

document.querySelectorAll('.hud-btns [data-act]').forEach((b) => b.addEventListener('click', () => actions[b.dataset.act]()));

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !els.log.classList.contains('hidden')) els.log.classList.add('hidden');
  const onButton = document.activeElement?.tagName === 'BUTTON';
  if (e.key === 'Enter' && !onButton && S.screen === 'rules' && !S.started) startGame(S.lang);
});

/* ---------------- Boot ---------------- */

async function boot() {
  try {
    const res = await fetch('api/config');
    if (res.ok) Object.assign(cfg, await res.json());
  } catch {
    /* keep defaults */
  }
  S.idleLeft = cfg.idleSeconds;
  els.modeNote.innerHTML =
    cfg.provider === 'offline'
      ? '⚠️ <b>OFFLINE DEMO</b> · ยังไม่ได้ใส่ API key แม่ค้าจะตอบแบบสคริปต์ง่าย ๆ (ใส่ key ใน .env เพื่อใช้ AI จริง)'
      : ''; // full-screen game: only show the note when something needs attention
  setPrice(cfg.startPrice, { silent: true });
  applyLang();
  els.npcText.textContent = L().greet(cfg.startPrice);
  showTitle();
}

boot();
