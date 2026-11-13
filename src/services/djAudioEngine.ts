'use client';

export interface DeckNodes {
  audio: HTMLAudioElement;
  source: MediaElementAudioSourceNode;
  gain: GainNode;
  eqLow: BiquadFilterNode;
  eqMid: BiquadFilterNode;
  eqHigh: BiquadFilterNode;
}

class DJAudioEngineService {
  private ctx: AudioContext | null = null;
  private deckA: DeckNodes | null = null;
  private deckB: DeckNodes | null = null;
  private crossfaderGainA: GainNode | null = null;
  private crossfaderGainB: GainNode | null = null;
  private masterGain: GainNode | null = null;

  // Analyser nodes for live VU levels
  private analyserA: AnalyserNode | null = null;
  private analyserB: AnalyserNode | null = null;
  private analyserMaster: AnalyserNode | null = null;

  // Headphone PFL Cue routing
  private cueGainA: GainNode | null = null;
  private cueGainB: GainNode | null = null;

  // Looping states
  private loopA = { active: false, start: 0, end: 0 };
  private loopB = { active: false, start: 0, end: 0 };

  public initContext(): AudioContext {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      // Master Level
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 1.0;

      // Crossfader gains
      this.crossfaderGainA = this.ctx.createGain();
      this.crossfaderGainB = this.ctx.createGain();
      this.crossfaderGainA.gain.value = 1.0;
      this.crossfaderGainB.gain.value = 1.0;

      // Headphone Cue gains
      this.cueGainA = this.ctx.createGain();
      this.cueGainB = this.ctx.createGain();
      this.cueGainA.gain.value = 0;
      this.cueGainB.gain.value = 0;

      // Analysers
      this.analyserA = this.ctx.createAnalyser();
      this.analyserB = this.ctx.createAnalyser();
      this.analyserMaster = this.ctx.createAnalyser();
      this.analyserA.fftSize = 64;
      this.analyserB.fftSize = 64;
      this.analyserMaster.fftSize = 64;

      // Routing: Crossfader -> Master Gain -> Master Analyser -> Destination
      this.crossfaderGainA.connect(this.masterGain);
      this.crossfaderGainB.connect(this.masterGain);

      // Cue gains connect directly to output for PFL auditioning
      this.cueGainA.connect(this.masterGain);
      this.cueGainB.connect(this.masterGain);

      this.masterGain.connect(this.analyserMaster);
      this.analyserMaster.connect(this.ctx.destination);
    }
    return this.ctx!;
  }

  public getContext(): AudioContext | null {
    return this.ctx || (typeof window !== 'undefined' ? this.initContext() : null);
  }

  private setupDeckNodes(deck: 'A' | 'B', audio: HTMLAudioElement): DeckNodes {
    const ctx = this.initContext();
    const source = ctx.createMediaElementSource(audio);

    // 3-band EQ filters
    // Low: Low-shelf at 250 Hz
    const eqLow = ctx.createBiquadFilter();
    eqLow.type = 'lowshelf';
    eqLow.frequency.value = 250;
    eqLow.gain.value = 0; // +/- 15 dB

    // Mid: Peaking filter at 1200 Hz with Q = 1.0
    const eqMid = ctx.createBiquadFilter();
    eqMid.type = 'peaking';
    eqMid.frequency.value = 1200;
    eqMid.Q.value = 1.0;
    eqMid.gain.value = 0;

    // High: High-shelf at 4000 Hz
    const eqHigh = ctx.createBiquadFilter();
    eqHigh.type = 'highshelf';
    eqHigh.frequency.value = 4000;
    eqHigh.gain.value = 0;

    // Channel volume gain
    const channelGain = ctx.createGain();
    channelGain.gain.value = 1.0;

    // Signal chain: Source -> EQ Low -> EQ Mid -> EQ High -> Channel Gain -> Analyser -> Crossfader
    source.connect(eqLow);
    eqLow.connect(eqMid);
    eqMid.connect(eqHigh);
    eqHigh.connect(channelGain);

    const targetAnalyser = deck === 'A' ? this.analyserA! : this.analyserB!;
    const targetCrossfader = deck === 'A' ? this.crossfaderGainA! : this.crossfaderGainB!;
    const targetCueGain = deck === 'A' ? this.cueGainA! : this.cueGainB!;

    channelGain.connect(targetAnalyser);
    targetAnalyser.connect(targetCrossfader);
    channelGain.connect(targetCueGain);

    return {
      audio,
      source,
      gain: channelGain,
      eqLow,
      eqMid,
      eqHigh,
    };
  }

  public playDeck(
    deck: 'A' | 'B',
    url: string,
    onProgress?: (pct: number, curr: number, dur: number) => void,
    onEnded?: () => void
  ): HTMLAudioElement {
    const ctx = this.initContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    // Stop current deck audio if playing
    const existing = deck === 'A' ? this.deckA : this.deckB;
    if (existing) {
      existing.audio.pause();
      existing.audio.src = '';
    }

    const audio = new Audio();
    audio.crossOrigin = 'anonymous';
    audio.src = url;

    const nodes = this.setupDeckNodes(deck, audio);
    if (deck === 'A') {
      this.deckA = nodes;
    } else {
      this.deckB = nodes;
    }

    audio.ontimeupdate = () => {
      // Handle loop wrapping if active
      const loop = deck === 'A' ? this.loopA : this.loopB;
      if (loop.active && loop.end > loop.start) {
        if (audio.currentTime >= loop.end) {
          audio.currentTime = loop.start;
        }
      }

      if (onProgress && audio.duration) {
        onProgress((audio.currentTime / audio.duration) * 100, audio.currentTime, audio.duration);
      }
    };

    audio.onended = () => {
      if (onEnded) onEnded();
    };

    audio.play().catch((err) => {
      console.warn('Playback requires user gesture or audio format error:', err);
    });

    return audio;
  }

  public pauseDeck(deck: 'A' | 'B') {
    const deckNodes = deck === 'A' ? this.deckA : this.deckB;
    if (deckNodes) deckNodes.audio.pause();
  }

  public resumeDeck(deck: 'A' | 'B') {
    const ctx = this.initContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    const deckNodes = deck === 'A' ? this.deckA : this.deckB;
    if (deckNodes) deckNodes.audio.play().catch(() => {});
  }

  public seekDeck(deck: 'A' | 'B', seconds: number) {
    const deckNodes = deck === 'A' ? this.deckA : this.deckB;
    if (deckNodes && deckNodes.audio.duration) {
      deckNodes.audio.currentTime = Math.max(0, Math.min(seconds, deckNodes.audio.duration));
    }
  }

  public setDeckPlaybackRate(deck: 'A' | 'B', rate: number) {
    const deckNodes = deck === 'A' ? this.deckA : this.deckB;
    if (deckNodes) {
      deckNodes.audio.playbackRate = Math.max(0.5, Math.min(2.0, rate));
    }
  }

  // 3-Band EQ Controls (-15dB to +12dB)
  public setEQ(deck: 'A' | 'B', band: 'low' | 'mid' | 'high', gainDb: number) {
    const deckNodes = deck === 'A' ? this.deckA : this.deckB;
    if (!deckNodes) return;
    const clampedGain = Math.max(-24, Math.min(12, gainDb));
    if (band === 'low') deckNodes.eqLow.gain.value = clampedGain;
    if (band === 'mid') deckNodes.eqMid.gain.value = clampedGain;
    if (band === 'high') deckNodes.eqHigh.gain.value = clampedGain;
  }

  // Channel Volume (0.0 to 1.5)
  public setDeckVolume(deck: 'A' | 'B', volume: number) {
    const deckNodes = deck === 'A' ? this.deckA : this.deckB;
    if (deckNodes) {
      deckNodes.gain.gain.value = Math.max(0, Math.min(1.5, volume));
    }
  }

  // Master Volume (0.0 to 1.5)
  public setMasterVolume(volume: number) {
    if (this.masterGain) {
      this.masterGain.gain.value = Math.max(0, Math.min(1.5, volume));
    }
  }

  // Smooth DJ Equal-Power Crossfader (-1.0 Deck A to +1.0 Deck B)
  public setCrossfade(position: number) {
    if (!this.crossfaderGainA || !this.crossfaderGainB) return;
    const pos = Math.max(-1, Math.min(1, position));
    const normalized = (pos + 1) / 2; // 0 (Deck A full) to 1 (Deck B full)

    // Equal-power crossfade curve: cos/sin
    const gainA = Math.cos(normalized * 0.5 * Math.PI);
    const gainB = Math.sin(normalized * 0.5 * Math.PI);

    this.crossfaderGainA.gain.value = gainA;
    this.crossfaderGainB.gain.value = gainB;
  }

  // Loop Controls
  public setLoop(deck: 'A' | 'B', active: boolean, startSec?: number, endSec?: number) {
    const target = deck === 'A' ? this.loopA : this.loopB;
    target.active = active;
    if (startSec !== undefined) target.start = startSec;
    if (endSec !== undefined) target.end = endSec;
  }

  // Headphone PFL Cue Toggle
  public setHeadphoneCue(deck: 'A' | 'B', enabled: boolean) {
    if (deck === 'A' && this.cueGainA) {
      this.cueGainA.gain.value = enabled ? 0.9 : 0;
    } else if (deck === 'B' && this.cueGainB) {
      this.cueGainB.gain.value = enabled ? 0.9 : 0;
    }
  }

  // Real-time Level Analysers for VU meters (0 to 100 scale)
  public getDeckLevel(deck: 'A' | 'B'): number {
    const analyser = deck === 'A' ? this.analyserA : this.analyserB;
    const deckNodes = deck === 'A' ? this.deckA : this.deckB;
    if (!analyser || !deckNodes || deckNodes.audio.paused) return 0;

    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i];
    }
    const avg = sum / data.length;
    return Math.min(100, Math.round((avg / 255) * 100 * 1.5));
  }

  public getMasterLevel(): number {
    if (!this.analyserMaster) return 0;
    const data = new Uint8Array(this.analyserMaster.frequencyBinCount);
    this.analyserMaster.getByteFrequencyData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i];
    }
    const avg = sum / data.length;
    return Math.min(100, Math.round((avg / 255) * 100 * 1.5));
  }
}

export const djAudioEngine = new DJAudioEngineService();
