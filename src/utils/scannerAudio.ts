/**
 * Robust Cross-Platform POS Barcode Scanner Audio Engine
 * Supports iOS Safari, iPad, Android Chrome, and Desktop
 * Dual-engine: Web Audio API (instant zero-latency) + Synthesized WAV Data URI (HTML5 Audio fallback)
 */

let sharedAudioCtx: AudioContext | null = null;
let cachedWavUri: string | null = null;

// Synthesize a high-pitch 1800Hz 95ms crisp supermarket scanner beep in pure PCM WAV
function getBeepWavUri(): string {
  if (cachedWavUri) return cachedWavUri;
  try {
    const sampleRate = 8000;
    const durationMs = 95;
    const freq = 1800;
    const numSamples = Math.floor((sampleRate * durationMs) / 1000);
    const buffer = new Uint8Array(44 + numSamples);

    // RIFF header
    buffer[0] = 0x52; buffer[1] = 0x49; buffer[2] = 0x46; buffer[3] = 0x46; // "RIFF"
    const fileSize = 36 + numSamples;
    buffer[4] = fileSize & 0xff;
    buffer[5] = (fileSize >> 8) & 0xff;
    buffer[6] = (fileSize >> 16) & 0xff;
    buffer[7] = (fileSize >> 24) & 0xff;
    // "WAVEfmt "
    buffer.set([0x57, 0x41, 0x56, 0x45, 0x66, 0x6d, 0x74, 0x20, 16, 0, 0, 0, 1, 0, 1, 0], 8);
    buffer[24] = sampleRate & 0xff;
    buffer[25] = (sampleRate >> 8) & 0xff;
    buffer[28] = sampleRate & 0xff; // Byte rate
    buffer[29] = (sampleRate >> 8) & 0xff;
    buffer[32] = 1; // Block align
    buffer[34] = 8; // Bits per sample
    // "data"
    buffer.set([0x64, 0x61, 0x74, 0x61], 36);
    buffer[40] = numSamples & 0xff;
    buffer[41] = (numSamples >> 8) & 0xff;

    // Generate sine wave samples with fast attack & natural exponential decay
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const decay = Math.exp(-i / (numSamples * 0.45));
      const sample = Math.round(128 + 115 * Math.sin(2 * Math.PI * freq * t) * decay);
      buffer[44 + i] = Math.max(0, Math.min(255, sample));
    }

    let binary = '';
    for (let i = 0; i < buffer.length; i++) {
      binary += String.fromCharCode(buffer[i]);
    }
    cachedWavUri = 'data:audio/wav;base64,' + btoa(binary);
    return cachedWavUri;
  } catch {
    return '';
  }
}

// Get or resume shared AudioContext
export function getAudioContext(): AudioContext | null {
  try {
    if (typeof window === 'undefined') return null;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
      sharedAudioCtx = new AudioContextClass();
    }
    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

// Unlock audio on initial user interaction (touch or click)
export function unlockScannerAudio() {
  try {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
  } catch {}
}

if (typeof window !== 'undefined') {
  window.addEventListener('click', unlockScannerAudio, { passive: true, once: false });
  window.addEventListener('touchstart', unlockScannerAudio, { passive: true, once: false });
}

/**
 * Play authentic cashier barcode scan beep with haptic vibration fallback
 */
export function playScannerBeep(): void {
  let playedWithWebAudio = false;

  // 1. Try Web Audio API (Zero Latency)
  try {
    const ctx = getAudioContext();
    if (ctx) {
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1850, ctx.currentTime);

      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.095);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.095);
      playedWithWebAudio = true;
    }
  } catch {
    playedWithWebAudio = false;
  }

  // 2. Fallback to HTML5 Audio element with Base64 WAV
  if (!playedWithWebAudio && typeof window !== 'undefined') {
    try {
      const uri = getBeepWavUri();
      if (uri) {
        const audio = new Audio(uri);
        audio.volume = 0.5;
        audio.play().catch(() => {});
      }
    } catch {}
  }

  // 3. Mobile Haptic Vibration Feedback
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(60);
    } catch {}
  }
}
