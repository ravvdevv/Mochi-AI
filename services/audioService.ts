
export class AudioService {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterGain: GainNode | null = null;
  private beatInterval: number | null = null;
  private currentBeatMode: 'PHONK' | 'DISCO' | 'NONE' = 'NONE';
  private step: number = 0;
  
  // Analyzer properties
  private analyser: AnalyserNode | null = null;
  private micStream: MediaStream | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private freqData: Uint8Array;

  constructor() {}

  private init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.connect(this.ctx.destination);
    this.masterGain.gain.value = 0.5;

    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.freqData = new Uint8Array(this.analyser.frequencyBinCount) as Uint8Array;
    // Connect internal sounds to the same analyzer
    this.masterGain.connect(this.analyser);
  }

  public async unlock() {
    this.init();
    if (this.ctx?.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  public async startListening() {
    this.init();
    try {
      if (this.micStream) return;
      this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (this.ctx && this.micStream) {
        this.micSource = this.ctx.createMediaStreamSource(this.micStream);
        // We connect the mic to the analyzer but NOT to the destination (to avoid feedback loops)
        this.micSource.connect(this.analyser!);
      }
    } catch (err) {
      console.error("Microphone access denied:", err);
    }
  }

  public stopListening() {
    if (this.micStream) {
      this.micStream.getTracks().forEach(track => track.stop());
      this.micStream = null;
    }
  }

  public getFrequencyData(): Uint8Array {
    if (this.analyser) {
      this.analyser.getByteFrequencyData(this.freqData as any);
    }
    return this.freqData;
  }

  public getAverageLevel(): number {
    if (!this.analyser) return 0;
    this.analyser.getByteFrequencyData(this.freqData as any);
    let sum = 0;
    for (let i = 0; i < this.freqData.length; i++) sum += this.freqData[i];
    return sum / this.freqData.length;
  }

  private playKick(time: number, distorted: boolean = false) {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.frequency.setValueAtTime(distorted ? 150 : 120, time);
    osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);

    gain.gain.setValueAtTime(0.8, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + 0.5);
  }

  private playHat(time: number) {
    if (!this.ctx || !this.masterGain) return;
    const bufferSize = this.ctx.sampleRate * 0.05;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 8000;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    source.start(time);
  }

  private playCowbell(time: number) {
    if (!this.ctx || !this.masterGain) return;
    const f1 = 800;
    const f2 = 540;
    
    [f1, f2].forEach(freq => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, time);
      gain.gain.setValueAtTime(0.15, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(time);
      osc.stop(time + 0.2);
    });
  }

  public playBlip(freq: number = 880, duration: number = 0.1) {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  public startBeat(mode: 'PHONK' | 'DISCO') {
    if (this.currentBeatMode === mode) return;
    this.stopBeat();
    this.currentBeatMode = mode;
    this.step = 0;
    
    const bpm = mode === 'PHONK' ? 135 : 128;
    const stepDuration = 60 / bpm / 4;

    this.beatInterval = window.setInterval(() => {
      if (!this.ctx) return;
      const time = this.ctx.currentTime + 0.1;

      if (mode === 'PHONK') {
        if (this.step % 8 === 0) this.playKick(time, true);
        if (this.step % 8 === 4) this.playKick(time, true);
        if (this.step % 16 === 10 || this.step % 16 === 14) this.playCowbell(time);
        if (this.step % 2 === 0) this.playHat(time);
      } else if (mode === 'DISCO') {
        if (this.step % 4 === 0) this.playKick(time, false);
        if (this.step % 4 === 2) this.playHat(time);
        if (this.step % 16 === 12) this.playBlip(1200, 0.05);
      }

      this.step = (this.step + 1) % 16;
    }, stepDuration * 1000);
  }

  public stopBeat() {
    if (this.beatInterval) {
      clearInterval(this.beatInterval);
      this.beatInterval = null;
    }
    this.currentBeatMode = 'NONE';
  }
}

export const audioService = new AudioService();
