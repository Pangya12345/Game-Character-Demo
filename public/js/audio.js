// Tiny chiptune-style sound effects with WebAudio (no audio files needed).
let ac = null;
let muted = false;

function tone(freq, dur, { type = 'square', vol = 0.04, slide = 0, delay = 0 } = {}) {
  if (muted) return;
  try {
    ac ??= new (window.AudioContext || window.webkitAudioContext)();
    const t0 = ac.currentTime + delay;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slide) osc.frequency.linearRampToValueAtTime(freq + slide, t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  } catch {
    /* audio not available */
  }
}

export const sfx = {
  blip: () => tone(560 + Math.random() * 90, 0.03, { vol: 0.018 }),
  send: () => tone(420, 0.09, { slide: 320, vol: 0.035 }),
  priceDown: () => { tone(880, 0.07, { vol: 0.03 }); tone(1175, 0.1, { vol: 0.03, delay: 0.07 }); },
  priceUp: () => tone(300, 0.18, { type: 'sawtooth', slide: -80, vol: 0.03 }),
  angry: () => tone(150, 0.25, { type: 'sawtooth', slide: -40, vol: 0.045 }),
  tick: () => tone(1250, 0.025, { vol: 0.02 }),
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, { vol: 0.04, delay: i * 0.11 })),
  lose: () => [392, 330, 262, 196].forEach((f, i) => tone(f, 0.22, { type: 'triangle', vol: 0.05, delay: i * 0.14 })),
  toggleMute: () => (muted = !muted),
};
