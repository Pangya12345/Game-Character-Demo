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

const T = {
  th: {
    mood: 'อารมณ์แม่ค้า:',
    price: 'ราคาปัจจุบัน:',
    turn: (t, m) => `รอบ ${t}/${m}`,
    chat: 'พิมพ์แชท:',
    placeholder: 'พิมพ์ต่อราคาได้เลย',
    moods: { neutral: 'เฉยๆ', happy: 'ดีใจ', angry: 'โกรธ', stressed: 'หงุดหงิด' },
    greet: (p) => `มะม่วงน้ำดอกไม้กิโลละ ${p} บาทจ้ะ พ่อหนุ่ม ราคานี้ลดไม่ได้แล้วน้า`,
    idleRaise: [
      (p) => `ว่าไงพ่อหนุ่ม ยืนเงียบทำไม? ป้าเสียเวลาขาย ขึ้นเป็น ${p} บาทนะ`,
      (p) => `เงียบอีกแล้ว! ยืนบังร้านป้าอยู่ได้ ${p} บาทเลยเอ้า!`,
      (p) => `${p} บาท! เตือนครั้งสุดท้ายนะ ยังเงียบอีกป้าไล่จริงด้วย!`,
    ],
    idleKick: 'ไป๊! ไม่ซื้อก็ไปให้พ้น ป้าจะขายคนอื่นแล้ว ไม่ขายให้แล้ว!',
    kicked: 'โดนไล่!',
    kickedMsg: 'ยืนเงียบนานเกินไป แม่ค้าเลยไล่ไปแล้ว ดีลล่ม!',
    outOfTurns: 'คุยวนไปวนมา ป้าเหนื่อยแล้ว วันนี้ไม่ขายแล้วจ้ะ!',
    wallet: (b, kg, total) => `งบ ${b}฿ · ${kg} กก. = ${total}฿`,
    mission: (b, kg) => `ภารกิจ: คุณมีเงิน <b>${b} บาท</b> ต้องซื้อมะม่วง <b>${kg} กิโล</b> (ต้องได้ไม่เกิน ${Math.floor(b / kg)}฿/กก.)`,
    missionToast: (b, kg) => `💰 มีเงิน ${b}฿ ต้องซื้อ ${kg} กก. ต่อให้อยู่ในงบ!`,
    broke: 'เงินไม่พอ!',
    brokeMsg: (total, b) => `ตกลงราคากันแล้ว รวม ${total}฿ แต่คุณมีแค่ ${b}฿... จ่ายไม่ไหว!`,
    leftover: (m) => `เหลือเงิน ${m} บาท`,
    netError: '(สัญญาณหาย... ข้อความยังอยู่ในช่องแชท ลองส่งอีกครั้งนะ)',
    fallback: 'AI ไม่ตอบ ตอนนี้ใช้โหมดสำรองชั่วคราว',
    rateLimited: 'ส่งถี่เกินไป รอสักครู่นะ',
    win: 'ดีลสำเร็จ!',
    lose: 'ดีลล่ม!',
    perKg: 'บาท/กก.',
    saved: (s) => (s > 0 ? `ประหยัดไป ${s} บาท/กก.` : 'ไม่ได้ลดเลยสักบาท'),
    turns: (t) => `ใช้ไป ${t} รอบ`,
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
    mood: 'Vendor Mood:',
    price: 'Current Price:',
    turn: (t, m) => `Turn ${t}/${m}`,
    chat: 'Chat:',
    placeholder: 'Start haggling',
    moods: { neutral: 'Neutral', happy: 'Happy', angry: 'Angry', stressed: 'Annoyed' },
    greet: (p) => `Nam Dok Mai mangoes, ${p} baht a kilo, dear. That's already my lowest, na.`,
    idleRaise: [
      (p) => `Well? Just standing there? You're costing me customers. It's ${p} baht now.`,
      (p) => `Silent again! You're blocking my stall. ${p} baht!`,
      (p) => `${p} baht! Last warning, say something or off you go!`,
    ],
    idleKick: 'Shoo! Not buying? Then move along, I have real customers. No sale!',
    kicked: 'KICKED OUT!',
    kickedMsg: 'You stood silent too long and Som Sri chased you off. Deal failed!',
    outOfTurns: "Round and round we go... I'm tired. No sale today!",
    wallet: (b, kg, total) => `Budget ${b}฿ · ${kg}kg = ${total}฿`,
    mission: (b, kg) => `Mission: you have <b>${b} baht</b> and must buy <b>${kg} kg</b> (max ${Math.floor(b / kg)}฿/kg).`,
    missionToast: (b, kg) => `💰 You have ${b}฿ for ${kg} kg. Stay within budget!`,
    broke: 'NOT ENOUGH MONEY!',
    brokeMsg: (total, b) => `You agreed on ${total}฿ in total, but you only have ${b}฿...`,
    leftover: (m) => `${m} baht left in your wallet`,
    netError: '(Connection lost... your message is still in the box, try sending again.)',
    fallback: 'AI did not respond; using backup mode for now',
    rateLimited: 'Too many messages, slow down a little',
    win: 'DEAL!',
    lose: 'NO DEAL!',
    perKg: 'baht/kg',
    saved: (s) => (s > 0 ? `You saved ${s} baht/kg` : 'Not a single baht off'),
    turns: (t) => `${t} turns used`,
    loseMsg: 'Som Sri refused to sell. Try a different approach!',
    again: 'Play again',
    share: 'Share result',
    copied: 'Result copied, send it to your friends!',
    grades: { S: 'Haggle Master', A: 'Smooth Talker', B: 'Not Bad', C: 'Auntie Wins' },
    shareText: (p, s, m) => `I haggled Auntie Som Sri's mangoes down to ${p}฿/kg (-${s}฿) with ${m}฿ of my budget left. Can you beat me?`,
    log: 'Negotiation log',
    logEmpty: 'Nothing said yet',
    you: 'You',
    vendor: 'Som Sri',
    hints: [
      'Be polite. Auntie softens for good manners.',
      'Give reasons: another stall is cheaper, student budget...',
      'Buying several kilos opens up bigger discounts.',
      'Chat a little and build rapport before pushing the price.',
      'Offers that are way too low make her angry.',
      "She remembers. The same trick won't work twice.",
      'Every silence raises the price. Stay quiet too long and she chases you off!',
      "Auntie doesn't know your budget. Try telling her.",
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

const cfg = { startPrice: 120, maxTurns: 12, idleSeconds: 25, maxPrice: 150, provider: 'offline', model: null };
const S = {
  started: false,
  over: false,
  busy: false,
  typing: false,
  lang: 'th',
  price: 120,
  mood: 'neutral',
  turn: 0,
  history: [],
  idleLeft: 25,
  idleStrikes: 0,
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
  els.turnVal.textContent = L().turn(S.turn, cfg.maxTurns);
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
    }, 32);
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
    await npcSay(L().idleKick);
    if (gen === S.gen) endGame('kicked');
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
        state: { current_price: S.price, turn: S.turn, lang: S.lang },
        history: S.history.slice(-24),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (gen !== S.gen) return;
    if (!res.ok) throw Object.assign(new Error(data.error || `HTTP ${res.status}`), { code: data.error });

    els.input.value = '';
    S.history.push({ role: 'player', text });
    if (data.detected_language !== S.lang) {
      S.lang = data.detected_language;
      applyLang();
    }
    if (data.warning === 'llm_error') toast(L().fallback);
    if (data.npc_mood === 'angry' && S.mood !== 'angry') sfx.angry();
    setMood(data.npc_mood);
    setPrice(data.current_price);
    await npcSay(data.npc_response);

    if (data.deal_closed) return endGame(S.price * S.mission.kg <= S.mission.budget ? 'win' : 'broke');
    if (data.deal_failed) return endGame('lose');
    if (S.turn >= cfg.maxTurns) {
      setMood('stressed');
      await npcSay(L().outOfTurns);
      return endGame('lose');
    }
  } catch (err) {
    if (gen !== S.gen) return;
    S.turn -= 1;
    renderTurn();
    showSystem(err.code === 'rate_limited' ? L().rateLimited : L().netError);
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
  const { budget, kg } = S.mission;
  showOverlay(`
    <h1>ตลาดต่อราคา<small>HAGGLE MARKET</small></h1>
    <p>ต่อราคามะม่วงกับ <b>แม่ค้าสมศรี</b> ให้ได้ถูกที่สุด! พิมพ์คุยได้อิสระทั้ง <b>ไทย</b> และ <b>English</b></p>
    <p class="en">Haggle mangoes with Auntie Som Sri. Type anything, in Thai or English.</p>
    <p class="mission">${T.th.mission(budget, kg)}<br><span class="en">${T.en.mission(budget, kg)}</span></p>
    <ul>
      <li>สุภาพ ให้เหตุผล ซื้อเหมา หรืออ้อนเก่ง ๆ = ได้ส่วนลด</li>
      <li>ต่อต่ำเกินเหตุหรือพูดไม่ดี = แม่ค้าโกรธ</li>
      <li>เงียบเกิน ${cfg.idleSeconds} วิ = แม่ค้าขึ้นราคา ยังเงียบต่อเรื่อย ๆ = โดนไล่ ดีลล่ม!</li>
      <li>มีเวลา ${cfg.maxTurns} รอบ ต้องตกลงราคาให้อยู่ในงบ ถ้าตกลงแล้วเงินไม่พอจ่าย = แพ้</li>
    </ul>
    <div class="row-btns">
      <button class="pbtn" data-start="th">เริ่มเกม (ไทย)</button>
      <button class="pbtn alt" data-start="en">START (English)</button>
    </div>`);
}

async function startGame(lang, { newMission = false } = {}) {
  hideOverlay();
  if (newMission) S.mission = pickMission();
  finishTyping();
  Object.assign(S, { started: true, over: false, busy: false, lang, turn: 0, history: [], idleStrikes: 0, gen: S.gen + 1 });
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
      const title = { broke: L().broke, kicked: L().kicked }[result] ?? L().lose;
      const msg = { broke: L().brokeMsg(total, S.mission.budget), kicked: L().kickedMsg }[result] ?? L().loseMsg;
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
};

els.form.addEventListener('submit', (e) => {
  e.preventDefault();
  send();
});

els.input.addEventListener('input', () => {
  if (S.busy || S.over) return;
  resetIdle(); // typing counts as responding
  renderPlayerBubble(els.input.value, true);
});
els.input.addEventListener('blur', () => {
  if (!S.busy && !els.input.value) renderPlayerBubble('', false);
});

els.npcBubble.addEventListener('click', finishTyping);

els.overlay.addEventListener('click', (e) => {
  const start = e.target.closest('[data-start]');
  if (start) startGame(start.dataset.start);
  if (e.target.closest('[data-restart]')) startGame(S.lang, { newMission: true });
  if (e.target.closest('[data-share]')) share();
});

$('btnMute').addEventListener('click', actions.mute);
$('btnRestart').addEventListener('click', actions.restart);
$('btnHome').addEventListener('click', showTitle);
$('btnLog').addEventListener('click', actions.log);
$('btnHint').addEventListener('click', actions.hint);
$('btnA').addEventListener('click', send);
$('btnB').addEventListener('click', () => {
  els.input.value = '';
  renderPlayerBubble('', false);
  els.input.focus();
});
document.querySelectorAll('.mobile-controls [data-act]').forEach((b) => b.addEventListener('click', () => actions[b.dataset.act]()));

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !els.log.classList.contains('hidden')) els.log.classList.add('hidden');
  const onButton = document.activeElement?.tagName === 'BUTTON';
  if (e.key === 'Enter' && !onButton && !els.overlay.classList.contains('hidden') && !S.started) startGame('th');
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
      : `AI: <b>${cfg.provider === 'gemini' ? 'Gemini' : 'Claude'}</b> (${cfg.model})`;
  setPrice(cfg.startPrice, { silent: true });
  applyLang();
  els.npcText.textContent = L().greet(cfg.startPrice);
  showTitle();
}

boot();
