// Tiny synthesized sound kit (WebAudio, no files, works offline).
let ctx: AudioContext | null = null;
let master: GainNode | null = null;

function ac() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const C = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
    master = ctx.createGain();
    master.gain.value = 0.6;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(freq: number, dur: number, type: OscillatorType, vol: number, slideTo?: number, delay = 0) {
  const c = ac();
  if (!c || !master) return;
  const t = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function noise(dur: number, vol: number, freq = 800) {
  const c = ac();
  if (!c || !master) return;
  const buf = c.createBuffer(1, c.sampleRate * dur, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const s = c.createBufferSource();
  s.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.value = freq;
  const g = c.createGain();
  g.gain.value = vol;
  s.connect(f).connect(g).connect(master);
  s.start();
}

export const sfx = {
  unlock: () => ac(),
  attack: () => {
    tone(90, 0.5, "sawtooth", 0.25, 40);
    noise(0.4, 0.5, 400);
    tone(880, 0.25, "square", 0.05, 220);
  },
  gong: () => {
    tone(55, 3.5, "sine", 0.7, 48);
    tone(110, 2.5, "triangle", 0.25, 96);
    tone(166, 2, "sine", 0.12);
    noise(0.6, 0.6, 120);
  },
  radar: () => {
    tone(1400, 0.6, "sine", 0.18, 700);
    tone(2100, 0.4, "sine", 0.06, 1200, 0.12);
  },
  revive: () => {
    [392, 523, 659, 784].forEach((f, i) => tone(f, 0.9, "sine", 0.14, undefined, i * 0.12));
  },
  coin: () => {
    tone(1318, 0.12, "square", 0.08);
    tone(1760, 0.4, "square", 0.08, undefined, 0.08);
  },
  meeting: () => {
    tone(70, 1.2, "sawtooth", 0.3, 50);
    [0, 0.5, 1].forEach((d) => tone(620, 0.3, "square", 0.08, 580, d));
  },
  reveal: () => tone(200, 1.5, "triangle", 0.25, 80),
  charge: (p: number) => tone(200 + p * 600, 0.06, "sine", 0.04),
  pay: () => {
    tone(660, 0.12, "sine", 0.15);
    tone(990, 0.3, "sine", 0.15, undefined, 0.1);
  },
  fail: () => {
    tone(160, 0.4, "square", 0.15, 80);
    noise(0.3, 0.4, 2000);
  },
};
