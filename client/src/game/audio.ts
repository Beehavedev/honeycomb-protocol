let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (!ctx) {
    try {
      ctx = new AudioContext();
    } catch {
      return null;
    }
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function playTone(freq: number, dur: number, type: OscillatorType, vol: number, detune = 0) {
  const c = getCtx();
  if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  o.detune.value = detune;
  g.gain.setValueAtTime(vol, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
  o.connect(g);
  g.connect(c.destination);
  o.start(c.currentTime);
  o.stop(c.currentTime + dur);
}

function playNoise(dur: number, vol: number, hipass = 2000) {
  const c = getCtx();
  if (!c) return;
  const bufSize = c.sampleRate * dur;
  const buf = c.createBuffer(1, bufSize, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const hp = c.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = hipass;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
  src.connect(hp);
  hp.connect(g);
  g.connect(c.destination);
  src.start(c.currentTime);
}

export function sfxCoin() {
  playTone(880, 0.08, "square", 0.08);
  setTimeout(() => playTone(1320, 0.06, "square", 0.06), 40);
  setTimeout(() => playTone(1760, 0.1, "sine", 0.05), 70);
}

export function sfxHit() {
  playNoise(0.25, 0.15, 800);
  playTone(120, 0.3, "sawtooth", 0.12);
  setTimeout(() => playTone(60, 0.2, "square", 0.08), 50);
}

export function sfxDash() {
  playTone(440, 0.15, "sawtooth", 0.06, 50);
  playTone(880, 0.12, "sine", 0.05);
  setTimeout(() => playTone(1760, 0.08, "sine", 0.04), 60);
  playNoise(0.1, 0.04, 4000);
}

export function sfxJump() {
  const c = getCtx();
  if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = "sine";
  o.frequency.setValueAtTime(220, c.currentTime);
  o.frequency.exponentialRampToValueAtTime(660, c.currentTime + 0.1);
  g.gain.setValueAtTime(0.06, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.15);
  o.connect(g);
  g.connect(c.destination);
  o.start(c.currentTime);
  o.stop(c.currentTime + 0.15);
}

export function sfxPowerup() {
  const notes = [523, 659, 784, 1047];
  notes.forEach((f, i) => {
    setTimeout(() => playTone(f, 0.12, "sine", 0.06), i * 50);
  });
  setTimeout(() => playTone(1047, 0.2, "triangle", 0.04), 200);
}

export function sfxPhase() {
  playTone(220, 0.4, "sawtooth", 0.06, -10);
  playTone(220, 0.4, "sawtooth", 0.06, 10);
  setTimeout(() => {
    playTone(440, 0.3, "square", 0.05);
    playTone(660, 0.3, "sine", 0.04);
  }, 150);
  setTimeout(() => {
    playTone(880, 0.25, "sine", 0.05);
    playNoise(0.15, 0.03, 6000);
  }, 300);
}

export function sfxSlide() {
  const c = getCtx();
  if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = "sawtooth";
  o.frequency.setValueAtTime(400, c.currentTime);
  o.frequency.exponentialRampToValueAtTime(100, c.currentTime + 0.12);
  g.gain.setValueAtTime(0.04, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.12);
  o.connect(g);
  g.connect(c.destination);
  o.start(c.currentTime);
  o.stop(c.currentTime + 0.12);
  playNoise(0.08, 0.03, 3000);
}

export function sfxDeath() {
  playTone(200, 0.5, "sawtooth", 0.1);
  playTone(150, 0.6, "square", 0.08, -20);
  setTimeout(() => {
    playTone(80, 0.5, "sawtooth", 0.08);
    playNoise(0.4, 0.1, 500);
  }, 100);
  setTimeout(() => playTone(40, 0.4, "square", 0.06), 250);
}

export function sfxShieldBreak() {
  playNoise(0.15, 0.08, 2000);
  playTone(600, 0.15, "sine", 0.06);
  setTimeout(() => playTone(300, 0.12, "triangle", 0.05), 60);
}

export function sfxCombo() {
  playTone(1200, 0.06, "sine", 0.04);
  setTimeout(() => playTone(1600, 0.08, "sine", 0.04), 30);
}

export function sfxMenuClick() {
  playTone(660, 0.06, "square", 0.05);
  setTimeout(() => playTone(990, 0.08, "sine", 0.04), 30);
}
