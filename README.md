# ตลาดต่อราคา · Haggle Market

เกม 2D Pixel Art แนวเจรจาต่อรองราคา: ต่อราคามะม่วงกับ **แม่ค้าสมศรี** ตัวละคร AI ที่ปากร้ายแต่ใจดี พิมพ์คุยได้อิสระทั้งภาษาไทยและอังกฤษ แม่ค้าจะตอบกลับเป็นภาษาเดียวกับที่คุณพิมพ์

- Frontend: HTML/CSS/JS ล้วน ตัวละครและฉากตลาดวาดด้วย canvas ความละเอียด 192×108 แล้วขยายแบบพิกเซลคม ๆ
- Backend: Node.js (Express) เรียกใช้ Gemini API หรือ Anthropic Claude API
- ถ้ายังไม่มี API key เกมจะเข้า **Offline demo mode** (แม่ค้าตอบแบบสคริปต์ง่าย ๆ) จึงเปิดเล่นได้ทันที

## วิธีรันบนเครื่อง

```bash
npm install
cp .env.example .env      # แล้วใส่ GEMINI_API_KEY หรือ ANTHROPIC_API_KEY
npm run dev               # เปิด http://localhost:3000
```

| ตัวแปร | ความหมาย |
|---|---|
| `LLM_PROVIDER` | `gemini`, `anthropic` หรือ `offline` (เว้นว่างไว้ได้ ระบบจะเลือกตาม key ที่มี) |
| `GEMINI_API_KEY` / `GEMINI_MODEL` | key และโมเดลของ Gemini (ค่าเริ่มต้น `gemini-3.5-flash-lite` ถ้าไม่ว่างจะสลับไป `GEMINI_FALLBACK_MODEL` ให้อัตโนมัติ) |
| `ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL` | key และโมเดลของ Claude (ค่าเริ่มต้น `claude-sonnet-5`; ถ้าอยากได้ถูกและเร็วกว่าใช้ `claude-haiku-4-5-20251001`) |
| `FLOOR_PRICE` | ราคาต่ำสุดที่แม่ค้ายอมขาย ซึ่งเป็นความลับ (ค่าเริ่มต้น 80) |
| `IDLE_SECONDS` | จำนวนวินาทีที่ยืนเงียบได้ก่อนแม่ค้าจะหงุดหงิด (25) |

ตั้ง `DEBUG_THOUGHTS=1` เพื่อดู "ความคิดในใจ" ของแม่ค้าใน console ของ server ได้ มีประโยชน์ตอนปรับ prompt

## วิธีเล่น

- **ภารกิจงบจำกัด**: ทุกเกมจะสุ่มงบและจำนวนที่ต้องซื้อ เช่น "มีเงิน 300฿ ต้องซื้อ 3 กก." ใต้ราคาปัจจุบันจะแสดงยอดรวม ถ้ายังเกินงบจะเป็นสีแดง ถ้าอยู่ในงบจะเป็นสีเขียว ถ้าตกลงราคาแล้วแต่เงินไม่พอจ่าย = แพ้ แม่ค้าไม่รู้ว่าคุณมีเงินเท่าไร นอกจากคุณจะบอกเอง (ตั้งค่าภารกิจได้ที่ `MISSIONS` ใน `public/js/game.js`)
- ต่อราคาจาก 120 บาท/กก. ให้ได้ถูกที่สุด ความสุภาพ เหตุผล การซื้อเหมา การอ้อน และการใช้เทคนิคต่อรอง ช่วยให้ได้ส่วนลด
- ถ้าต่อต่ำเกินเหตุ (เช่น 10 บาท) หรือพูดจาไม่ดี แม่ค้าจะโกรธ และอาจขึ้นราคา
- **Idle timer**: ถ้าไม่ส่งข้อความครบเวลา (พิมพ์ค้างไว้ไม่ส่งก็นับ) แม่ค้าจะขึ้นราคาครั้งละ 5 บาท (ครั้งที่ 1–3) และหงุดหงิดขึ้นเรื่อย ๆ ครั้งที่ 3 จะเป็นคำเตือนสุดท้าย ถ้ายังเงียบต่อเป็นครั้งที่ 4 จะ **โดนไล่ ดีลล่ม** ทันทีที่ส่งข้อความ ตัวนับจะเริ่มใหม่
- ปุ่มบนจอยใช้ได้จริง: **A** ส่ง · **B** ล้างข้อความ · **X** บันทึกการคุย · **Y** คำใบ้ · **+** เริ่มใหม่ · **−** เปิด/ปิดเสียง · **Home** กลับหน้าแรก
- บนมือถือ บับเบิลและช่องแชทจะย้ายไปอยู่ใต้ฉาก และมีปุ่ม LOG / HINT / SOUND / RESTART ให้กด

## ระบบ AI

ทุกครั้งที่ผู้เล่นส่งข้อความ server จะส่งสิ่งต่อไปนี้ให้ LLM: บุคลิกของแม่ค้า (อายุ ประวัติ ต้นทุน นิสัยปากร้ายใจดี) กติกาการลดราคา บทสนทนาทั้งหมดที่ผ่านมา และราคาปัจจุบัน
LLM จะคิดใน `inner_thoughts` ก่อนว่าผู้เล่นพูดอะไร เหตุผลดีแค่ไหน แล้วจะลดราคาเท่าไรเพราะอะไร จากนั้นจึงตอบ ฟิลด์นี้ server จะตัดทิ้ง ไม่ส่งไปถึงผู้เล่น
ข้อมูลที่ client ได้รับเป็น JSON ตาม spec:

```json
{
  "detected_language": "th",
  "npc_response": "ต่อเก่งจริงนะเรา! 112 บาทเป็นไง ต่ำกว่านี้ป้าเจ๊งแน่",
  "npc_mood": "neutral",
  "current_price": 112,
  "deal_closed": false,
  "deal_failed": false
}
```

(มีฟิลด์ `mode` แถมมาด้วย เพื่อบอกว่าคำตอบนี้มาจาก AI ตัวไหน)

Server ไม่เชื่อ AI ทั้งหมด จะตรวจซ้ำเสมอ: ราคาต้องไม่ต่ำกว่า `FLOOR_PRICE` และขึ้นได้ไม่เกิน 10 บาทต่อรอบ ค่า mood และภาษาต้องอยู่ในชุดที่กำหนด
ถ้า API ล่มหรือ timeout ระบบจะสลับไปใช้ offline mode ชั่วคราวให้อัตโนมัติ เกมจึงไม่ค้าง

- Gemini ใช้ `responseSchema` บังคับให้ตอบเป็น JSON
- Claude ใช้ tool use แบบบังคับ (`tool_choice`) เพื่อให้ได้ JSON ที่ถูกโครงสร้างเสมอ

## Deploy (ได้ลิงก์ไปส่งให้เพื่อนเล่น)

### Vercel
1. push โปรเจกต์ขึ้น GitHub
2. ที่ vercel.com เลือก **Add New → Project** แล้ว import repo นี้ (Framework Preset: **Other** ไม่ต้องตั้ง build command)
3. ที่ **Settings → Environment Variables** ใส่ `GEMINI_API_KEY` หรือ `ANTHROPIC_API_KEY`
4. กด Deploy จะได้ลิงก์ประมาณ `https://haggle-market.vercel.app`

บน Vercel ไฟล์ใน `public/` จะเสิร์ฟเป็น static ส่วน `api/negotiate.js` กับ `api/config.js` จะรันเป็น serverless function ที่เรียกใช้โค้ดชุดเดียวกับใน `backend/`

### Render
1. push ขึ้น GitHub
2. ที่ render.com เลือก **New → Blueprint** แล้วเลือก repo นี้ ระบบจะอ่านค่าจาก `render.yaml` ให้เอง (หรือจะสร้างเป็น Web Service เองก็ได้ โดยตั้ง Build: `npm install`, Start: `npm start`)
3. ใส่ API key ใน Environment
4. จะได้ลิงก์ประมาณ `https://haggle-market.onrender.com` (plan ฟรีจะ sleep เมื่อไม่มีคนใช้ ครั้งแรกที่เปิดหลังจากนั้นอาจรอประมาณ 30 วินาที)

> อย่า commit ไฟล์ `.env` เด็ดขาด (ไฟล์นี้อยู่ใน `.gitignore` แล้ว) ให้ใส่ key ในหน้า dashboard ของ Vercel หรือ Render เท่านั้น

## โครงสร้างโปรเจกต์

```
├── api/                 # Vercel serverless functions
│   ├── negotiate.js     #   POST /api/negotiate
│   └── config.js        #   GET  /api/config
├── backend/
│   ├── server.js        # Express server (local / Render)
│   ├── negotiate.js     # ตรวจ input/output, rate limit, fallback
│   ├── llm.js           # เรียก Gemini / Claude
│   ├── prompt.js        # บุคลิกและกติกาของแม่ค้าสมศรี
│   ├── offline.js       # แม่ค้าแบบ rule-based (ใช้ตอนไม่มี key)
│   └── config.js
├── public/
│   ├── index.html       # หน้าจอเครื่องเกมพกพา
│   ├── css/style.css
│   └── js/
│       ├── game.js      # state, idle timer, UI 2 ภาษา
│       ├── scene.js     # pixel art: ฉากตลาด, sprite, สีหน้าตามอารมณ์
│       └── audio.js     # เสียง chiptune ด้วย WebAudio
├── .env.example
├── vercel.json
└── render.yaml
```
