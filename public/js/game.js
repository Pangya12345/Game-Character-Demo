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
  npcBubble: $('npcBubble'),
  npcText: $('npcText'),
  playerBubble: $('playerBubble'),
  playerText: $('playerText'),
  form: $('chatForm'),
  input: $('chatInput'),
  sendBtn: $('sendBtn'),
  toast: $('toast'),
  log: $('logPanel'),
  overlay: $('overlay'),
  modeNote: $('modeNote'),
  wallet: $('walletVal'),
};

/* ---------------- Text (UI follows the language the player types in) ---------------- */

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Same rule as the server: English mode = no Thai letters; Thai mode = must contain Thai.
function matchesLanguage(text, lang) {
  const thai = (text.match(/[\u0E00-\u0E7F]/g) || []).length;
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
      `ดูได้ จับได้ ชิมไม่ได้นะ! น้ำดอกไม้แท้ ๆ กิโลละ ${p} จ้ะ`,
      `มาแล้วเหรอ ยืนดูตั้งนาน จะเอากี่โลล่ะ? กิโลละ ${p} บาท`,
      `ร้อนก็ร้อน... เอามะม่วงไปกินให้ชื่นใจไหมหลาน กิโลละ ${p} ไม่แพงหรอก`,
    ]),
    idleRaise: [
      (p) => pick([
        `ว่าไงพ่อหนุ่ม ยืนเงียบทำไม? ป้าเสียเวลาขาย ขึ้นเป็น ${p} บาทนะ`,
        `ยืนเหม่ออะไรล่ะ ลูกค้าคนอื่นรออยู่นะ คิดนานก็ ${p} บาทไปเลย`,
        `เงียบแบบนี้ป้าถือว่าไม่รีบนะ งั้นราคาขึ้นเป็น ${p} บาท`,
      ]),
      (p) => pick([
        `เงียบอีกแล้ว! ยืนบังร้านป้าอยู่ได้ ${p} บาทเลยเอ้า!`,
        `นี่มาซื้อหรือมาหลบแดดจ๊ะ? ${p} บาทแล้วนะ`,
        `ป้าไม่มีเวลาทั้งวันนะหนู ${p} บาท จะเอาก็ว่ามา`,
      ]),
      (p) => pick([
        `${p} บาท! เตือนครั้งสุดท้ายนะ ยังเงียบอีกป้าไล่จริงด้วย!`,
        `ครั้งสุดท้ายแล้วนะ ${p} บาท ไม่พูดอะไรป้าไม่ขายแล้ว!`,
      ]),
    ],
    idleKick: () => pick([
      'ไป๊! ไม่ซื้อก็ไปให้พ้น ป้าจะขายคนอื่นแล้ว ไม่ขายให้แล้ว!',
      'พอแล้ว ๆ ยืนเป็นหุ่นอยู่ได้ ไปเลยไป ป้าจะเก็บร้านแล้ว!',
      'เสียเวลาป้าจริง ๆ! หลีกไปเลย ให้คนอื่นเขาซื้อบ้าง!',
    ]),
    kicked: 'โดนไล่!',
    kickedMsg: 'ยืนเงียบนานเกินไป แม่ค้าเลยไล่ไปแล้ว ดีลล่ม!',
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
    wrongLangHistory: '(พูดภาษาที่แม่ค้าฟังไม่ออก)',
    langKickedMsg: 'คุยกันไม่รู้เรื่อง แม่ค้าเลยไม่ขายให้แล้ว ดีลล่ม!',
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
    hints: [
      'พูดจาสุภาพ มีหางเสียง แม่ค้าจะใจอ่อนง่ายขึ้น',
      'ลองให้เหตุผล เช่น ร้านอื่นถูกกว่า หรือเป็นนักศึกษางบน้อย',
      'ซื้อเหมาหลายกิโล มีโอกาสได้ส่วนลดมากขึ้น',
      'ชวนคุยเรื่องอื่นบ้าง สร้างความสนิทก่อนค่อยต่อราคา',
      'ต่อราคาต่ำเกินไป แม่ค้าจะโกรธและไม่ลดให้',
      'ใช้มุกเดิมซ้ำ ๆ ไม่ได้ผลนะ แม่ค้าจำได้',
      'ยิ่งยืนเงียบ แม่ค้ายิ่งขึ้นราคา เงียบนานเกินไปจะโดนไล่!',
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
      `Look all you want, but no free samples! ${p} a kilo.`,
      `You've been staring for a while. How many kilos? ${p} each.`,
      `Hot out today, huh? Grab some mangoes. Just ${p} a kilo.`,
    ]),
    idleRaise: [
      (p) => pick([
        `Hello? You just gonna stand there? Now it's ${p}.`,
        `Take your time, but it'll cost you. ${p} baht now.`,
        `Other people are waiting, you know. ${p} now.`,
      ]),
      (p) => pick([
        `Still nothing? You're blocking my stand. ${p}!`,
        `Are you buying or just hiding from the sun? ${p} now.`,
        `I don't have all day. ${p}. Say something.`,
      ]),
      (p) => pick([
        `${p}! Last warning. Say something or I'm done with you.`,
        `Last chance: ${p}. One more time and no deal!`,
      ]),
    ],
    idleKick: () => pick([
      "Okay, that's it. If you're not buying, move along. No sale!",
      "Forget it. You're just standing there. I'm done, go on!",
      "You're wasting my time. Step aside and let someone else buy!",
    ]),
    kicked: 'GAME OVER',
    kickedMsg: 'You were idle too long. Som Sri kicked you out.',
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
    wrongLangHistory: '(said something Som Sri could not understand)',
    langKickedMsg: 'You kept using the wrong language, so she gave up on you.',
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
    hints: [
      'TIP: Being polite gets you better prices.',
      'TIP: Give a good reason, like a cheaper stall nearby or a tight budget.',
      'TIP: Buy more kilos for a bigger discount.',
      'TIP: Build rapport before asking for a lower price.',
      'TIP: Lowball offers only annoy her.',
      "TIP: She remembers everything. Tricks won't work twice.",
      'TIP: Staying idle raises the price. Too long and you get kicked out.',
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
  idleStrikes: 0,
  wrongLang: 0,
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

/* ---------------- Idle timer ---------------- */

let lastTick = performance.now();
setInterval(() => {
  const now = performance.now();
  const dt = (now - lastTick) / 1000;
  lastTick = now;
  const running = S.started && !S.over && !S.busy && !S.typing && !document.hidden && els.log.classList.contains('hidden');
  document.querySelector('.timer').classList.toggle('paused', !running);
  if (!running) return;

  const before = Math.ceil(S.idleLeft);
  S.idleLeft = Math.max(0, S.idleLeft - dt);
  const frac = S.idleLeft / cfg.idleSeconds;
  els.timerBar.style.width = `${frac * 100}%`;
  els.timerBar.classList.toggle('warn', S.idleLeft <= 8);
  if (S.idleLeft <= 5 && Math.ceil(S.idleLeft) !== before) sfx.tick();
  if (S.idleLeft <= 0) onIdle();
}, 100);

function resetIdle() {
  S.idleLeft = cfg.idleSeconds;
  els.timerBar.style.width = '100%';
  els.timerBar.classList.remove('warn');
}

// Each silence raises the price by IDLE_RAISE; staying silent after the last warning ends the deal.
const IDLE_RAISE = 5;

async function onIdle() {
  if (S.busy) return;
  S.idleStrikes += 1;
  resetIdle();
  const raises = L().idleRaise;
  if (S.idleStrikes <= raises.length) {
    setMood(S.idleStrikes === 1 ? 'stressed' : 'angry');
    if (S.idleStrikes > 1) sfx.angry();
    setPrice(Math.min(S.price + IDLE_RAISE, cfg.maxPrice));
    await npcSay(raises[S.idleStrikes - 1](S.price));
    resetIdle();
  } else {
    S.over = true; // no escaping by typing while she chases you off
    setInputEnabled(false);
    setMood('angry');
    sfx.angry();
    const gen = S.gen;
    await npcSay(L().idleKick());
    if (gen === S.gen) endGame('kicked');
  }
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
  S.idleStrikes = 0;
  resetIdle();
  const lines = L().wrongLangLines;
  const n = S.wrongLang;
  if (n === 1) toast(L().wrongLang, 3000);
  if (n <= 2) {
    setMood('confused');
  } else if (n === 3) {
    setMood('stressed');
  } else if (n <= lines.length) {
    setMood('angry');
    sfx.angry();
    setPrice(Math.min(S.price + 5, cfg.maxPrice));
  } else {
    S.over = true;
    setMood('angry');
    sfx.angry();
    await npcSay(L().wrongLangKick);
    if (gen === S.gen) endGame('langKicked');
    return;
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
}

async function send() {
  const text = els.input.value.trim();
  if (!S.started || S.over || S.busy || !text) return;
  if (!matchesLanguage(text, S.lang)) return onWrongLanguage(text);

  const gen = S.gen;
  S.busy = true;
  S.turn += 1;
  S.idleStrikes = 0;
  resetIdle();
  renderTurn();
  setInputEnabled(false);
  renderPlayerBubble(text, false);
  scene.hop();
  sfx.send();
  showThinking();

  try {
    const res = await fetch('api/negotiate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        message: text,
        state: { current_price: S.price, turn: S.turn, lang: S.lang, day_seed: S.daySeed },
        history: S.history.slice(-24),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (gen !== S.gen) return;
    if (!res.ok) throw Object.assign(new Error(data.error || `HTTP ${res.status}`), { code: data.error });

    els.input.value = '';
    S.history.push({ role: 'player', text });
    if (data.warning === 'llm_error') toast(L().fallback);
    if (data.npc_mood === 'angry' && S.mood !== 'angry') sfx.angry();
    setMood(data.npc_mood);
    setPrice(data.current_price);
    await npcSay(data.npc_response);

    if (data.deal_closed) return endGame(S.price * S.mission.kg <= S.mission.budget ? 'win' : 'broke');
    if (data.deal_failed) return endGame('lose');
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
      <li><b>พิมพ์คุยได้อิสระ</b> แม่ค้าเป็น AI ที่คิดและตอบตามสิ่งที่คุณพูดจริง ๆ (<b>พิมพ์ภาษาไทยเท่านั้น</b> ถ้าพิมพ์ภาษาอื่นแม่ค้าจะงง ถ้าบ่อย ๆ จะโกรธ)</li>
      <li><b>วิธีได้ส่วนลด:</b> พูดสุภาพ ให้เหตุผลที่น่าเชื่อ ซื้อหลายกิโล อ้อนหรือชวนคุย ใช้เทคนิคต่อรอง</li>
      <li><b>แม่ค้าจะโกรธ</b> ถ้าต่อต่ำเกินเหตุ (เช่น 10 บาท) หรือพูดไม่ดี อาจขึ้นราคา ถ้า<b>ด่าหรือพูดหยาบคายมาก ๆ = ดีลล่มทันที!</b></li>
      <li>แม่ค้า<b>จำได้</b>ว่าคุยอะไรกันไปแล้ว ใช้มุกเดิมซ้ำไม่ได้ผล <b>ถามคำถามเดิมซ้ำ ๆ แม่ค้าจะรำคาญ ถ้ายังไม่หยุดจะดีลล่ม!</b> และแม่ค้าไม่รู้ว่าคุณมีเงินเท่าไร ถ้าคุณไม่บอก</li>
      <li><b>ห้ามเงียบ:</b> ถ้าไม่ส่งข้อความเกิน ${cfg.idleSeconds} วินาที (พิมพ์ค้างไว้ไม่ส่งก็นับ) ราคาขึ้นครั้งละ 5 บาท (เตือน 3 ครั้ง) ครั้งที่ 4 <b>โดนไล่ ดีลล่ม!</b></li>
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
      <li><b>Chat freely</b> in <b>English only</b>. Som Sri is an AI and responds to what you say. Other languages confuse her, and she gets mad if you keep trying.</li>
      <li><b>Get discounts</b> by being polite, giving good reasons, buying more, or using haggling tactics.</li>
      <li><b>Lowball offers</b> and rudeness will annoy her. <b>Insults end the deal immediately.</b></li>
      <li><b>She remembers everything.</b> Repeated tricks won't work. <b>Keep asking the same thing and she gets annoyed, then ends the deal.</b> She doesn't know your budget unless you tell her.</li>
      <li><b>Idle timer:</b> every ${cfg.idleSeconds}s without sending a message (typing doesn't count) raises the price by 5฿. After 3 warnings, you get kicked out.</li>
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
  hideOverlay();
  if (newMission) S.mission = pickMission();
  finishTyping();
  // daySeed picks a different "day at the market" for the AI each game
  Object.assign(S, { screen: 'game', started: true, over: false, busy: false, lang, turn: 0, history: [], idleStrikes: 0, wrongLang: 0, gen: S.gen + 1, daySeed: Math.floor(Math.random() * 1000) });
  setPrice(cfg.startPrice, { silent: true });
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
  S.over = true;
  setInputEnabled(false);
  const saved = cfg.startPrice - S.price;
  const total = S.price * S.mission.kg;
  setTimeout(() => {
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
      const title = { broke: L().broke, kicked: L().kicked, langKicked: L().lose }[result] ?? L().lose;
      const msg = { broke: L().brokeMsg(total, S.mission.budget), kicked: L().kickedMsg, langKicked: L().langKickedMsg }[result] ?? L().loseMsg;
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

function toggleLog() {
  renderLog();
  els.log.classList.toggle('hidden');
}

/* ---------------- Controls ---------------- */

const actions = {
  log: toggleLog,
  hint: () => {
    const hints = L().hints;
    toast(`💡 ${hints[Math.floor(Math.random() * hints.length)]}`, 3500);
  },
  mute: () => toast(sfx.toggleMute() ? '🔇 Sound off' : '🔊 Sound on', 1200),
  restart: () => (S.started ? startGame(S.lang, { newMission: true }) : showTitle()),
  menu: showTitle,
};

els.form.addEventListener('submit', (e) => {
  e.preventDefault();
  send();
});

els.input.addEventListener('input', () => {
  if (S.busy || S.over) return;
  // typing does NOT pause her patience: only sending a message resets the timer
  renderPlayerBubble(els.input.value, true);
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
