const audioCtx = typeof window !== "undefined" ? new (window.AudioContext || (window as any).webkitAudioContext)() : null;

function ensureContext() {
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume();
  }
}

function playTone(freq: number, duration: number, type: OscillatorType = "square", vol = 0.15, detune = 0) {
  if (!audioCtx) return;
  ensureContext();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  osc.detune.value = detune;
  gain.gain.setValueAtTime(vol, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

function playNoise(duration: number, vol = 0.1) {
  if (!audioCtx) return;
  ensureContext();
  const bufferSize = audioCtx.sampleRate * duration;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }
  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(vol, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  const filter = audioCtx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = 800;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);
  source.start();
}

export function playPunchSound() {
  playNoise(0.08, 0.2);
  playTone(200, 0.08, "square", 0.12);
  setTimeout(() => playTone(100, 0.06, "square", 0.08), 30);
}

export function playHeavyPunchSound() {
  playNoise(0.12, 0.25);
  playTone(150, 0.1, "square", 0.15);
  setTimeout(() => {
    playTone(80, 0.08, "sawtooth", 0.1);
    playNoise(0.06, 0.15);
  }, 40);
}

export function playSpecialSound() {
  if (!audioCtx) return;
  ensureContext();
  for (let i = 0; i < 6; i++) {
    setTimeout(() => {
      playTone(300 + i * 100, 0.15, "sawtooth", 0.08, i * 50);
    }, i * 30);
  }
  setTimeout(() => {
    playNoise(0.2, 0.2);
    playTone(600, 0.3, "square", 0.12);
  }, 150);
  setTimeout(() => playTone(800, 0.2, "sine", 0.06), 250);
}

export function playBlockSound() {
  playTone(400, 0.05, "square", 0.1);
  playTone(300, 0.08, "square", 0.08);
  playNoise(0.04, 0.08);
}

export function playCounterSound() {
  playTone(500, 0.06, "square", 0.1);
  setTimeout(() => {
    playTone(700, 0.08, "sawtooth", 0.12);
    playNoise(0.1, 0.15);
  }, 80);
  setTimeout(() => playTone(900, 0.1, "square", 0.08), 160);
}

export function playKOSound() {
  if (!audioCtx) return;
  ensureContext();
  playNoise(0.3, 0.3);
  playTone(200, 0.3, "sawtooth", 0.15);
  setTimeout(() => {
    playTone(150, 0.4, "square", 0.12);
    playNoise(0.2, 0.2);
  }, 100);
  setTimeout(() => playTone(80, 0.5, "sawtooth", 0.1), 200);
  setTimeout(() => playTone(60, 0.6, "square", 0.08), 350);
}

export function playRoundSound() {
  playTone(440, 0.15, "square", 0.08);
  setTimeout(() => playTone(550, 0.15, "square", 0.08), 150);
  setTimeout(() => playTone(660, 0.2, "square", 0.1), 300);
}

export function playFightSound() {
  playTone(880, 0.1, "square", 0.12);
  setTimeout(() => playTone(660, 0.1, "square", 0.1), 80);
  setTimeout(() => {
    playTone(880, 0.2, "sawtooth", 0.12);
    playTone(440, 0.2, "square", 0.08);
  }, 160);
}

export function playVictorySound() {
  if (!audioCtx) return;
  ensureContext();
  const notes = [523, 659, 784, 1047];
  notes.forEach((f, i) => {
    setTimeout(() => playTone(f, 0.25, "square", 0.08), i * 120);
  });
}

export function playMissSound() {
  playTone(250, 0.06, "sine", 0.04);
}

export function playMoveSelectSound() {
  playTone(600, 0.05, "square", 0.06);
}

export function playChipDamageSound() {
  playTone(350, 0.04, "square", 0.06);
  playNoise(0.03, 0.05);
}
