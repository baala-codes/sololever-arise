/** Generated tones — no audio assets to ship. Safe to call before user gesture (fails silently). */
type Tone = { f: number; d: number; delay?: number };

const PRESETS: Record<string, Tone[]> = {
  roundEnd: [
    { f: 660, d: 0.12 },
    { f: 880, d: 0.16, delay: 0.14 },
  ],
  levelUp: [
    { f: 523, d: 0.1 },
    { f: 659, d: 0.1, delay: 0.1 },
    { f: 784, d: 0.1, delay: 0.2 },
    { f: 1046, d: 0.28, delay: 0.3 },
  ],
  tick: [{ f: 1200, d: 0.03 }],
};

let ctx: AudioContext | null = null;

function context(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  return ctx;
}

export function play(name: keyof typeof PRESETS) {
  const audio = context();
  if (!audio) return;
  if (audio.state === "suspended") void audio.resume();
  const start = audio.currentTime;
  for (const tone of PRESETS[name] ?? []) {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = "triangle";
    osc.frequency.value = tone.f;
    const at = start + (tone.delay ?? 0);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.16, at + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + tone.d);
    osc.connect(gain).connect(audio.destination);
    osc.start(at);
    osc.stop(at + tone.d + 0.02);
  }
}

export function unlockAudio() {
  const audio = context();
  if (audio && audio.state === "suspended") void audio.resume();
}
