"use client";

/**
 * Procedural sound design (Web Audio). Nothing is downloaded: wind, drone and
 * interface sounds are synthesised so the site has its own sonic identity.
 * Audio only starts after an explicit user gesture (the Sound toggle).
 */
class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private ambBus: GainNode | null = null;
  private reverb: ConvolverNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private droneFilter: BiquadFilterNode | null = null;
  private noise: AudioBuffer | null = null;
  private enabled = false;
  private lastTick = 0;
  private lastUpdate = 0;
  private rumble: GainNode | null = null;
  private rumbleFilter: BiquadFilterNode | null = null;
  private shimmer: GainNode | null = null;
  private hum: GainNode | null = null;
  private humOscs: { osc: OscillatorNode; base: number }[] = [];

  get isEnabled() {
    return this.enabled;
  }

  private build() {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    this.ctx = ctx;

    const master = ctx.createGain();
    master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 3;
    master.connect(comp).connect(ctx.destination);
    this.master = master;

    // Generated impulse response: a cold, wide space.
    const len = Math.floor(ctx.sampleRate * 3.2);
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    const reverb = ctx.createConvolver();
    reverb.buffer = ir;
    const wet = ctx.createGain();
    wet.gain.value = 0.42;
    reverb.connect(wet).connect(master);
    this.reverb = reverb;

    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = 0.5;
    this.sfxBus.connect(master);
    this.sfxBus.connect(reverb);

    this.ambBus = ctx.createGain();
    this.ambBus.gain.value = 0.55;
    this.ambBus.connect(master);
    this.ambBus.connect(reverb);

    // Shared noise buffer.
    const nb = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const nd = nb.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    this.noise = nb;

    // Wind: band-passed noise with a slowly wandering centre frequency.
    const wind = ctx.createBufferSource();
    wind.buffer = nb;
    wind.loop = true;
    const wf = ctx.createBiquadFilter();
    wf.type = "bandpass";
    wf.frequency.value = 420;
    wf.Q.value = 0.9;
    const wg = ctx.createGain();
    wg.gain.value = 0.11;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 220;
    lfo.connect(lfoGain).connect(wf.frequency);
    wind.connect(wf).connect(wg).connect(this.ambBus);
    wind.start();
    lfo.start();
    this.windFilter = wf;

    // Drone: low detuned partials through a lowpass.
    const df = ctx.createBiquadFilter();
    df.type = "lowpass";
    df.frequency.value = 240;
    df.Q.value = 0.6;
    const dg = ctx.createGain();
    dg.gain.value = 0.085;
    df.connect(dg).connect(this.ambBus);
    for (const [f, type] of [
      [55, "sawtooth"],
      [55.35, "sawtooth"],
      [82.4, "sine"],
      [110.2, "triangle"],
    ] as const) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.value = type === "sawtooth" ? 0.35 : 0.5;
      o.connect(g).connect(df);
      o.start();
    }
    this.droneFilter = df;

    // --- Animation-driven layers (gains start at 0, driven by update()) ---
    const layer = (gain = 0) => {
      const g = ctx.createGain();
      g.gain.value = gain;
      g.connect(this.ambBus!);
      return g;
    };

    // Rumble: low noise for stone blocks shifting / fly-throughs.
    const rumbleSrc = ctx.createBufferSource();
    rumbleSrc.buffer = nb;
    rumbleSrc.loop = true;
    const rf = ctx.createBiquadFilter();
    rf.type = "lowpass";
    rf.frequency.value = 140;
    rf.Q.value = 0.8;
    this.rumble = layer();
    rumbleSrc.connect(rf).connect(this.rumble);
    rumbleSrc.start();
    this.rumbleFilter = rf;

    // Shimmer: glassy partials + airy noise, for tumbling crystals.
    this.shimmer = layer();
    const shimmerFilter = ctx.createBiquadFilter();
    shimmerFilter.type = "bandpass";
    shimmerFilter.frequency.value = 5200;
    shimmerFilter.Q.value = 1.6;
    const airSrc = ctx.createBufferSource();
    airSrc.buffer = nb;
    airSrc.loop = true;
    const airGain = ctx.createGain();
    airGain.gain.value = 0.35;
    airSrc.connect(shimmerFilter).connect(airGain).connect(this.shimmer);
    airSrc.start(0, 0.7);
    for (const f of [1318.5, 1975.5, 2637, 3322.4]) {
      const o = ctx.createOscillator();
      o.frequency.value = f;
      const trem = ctx.createOscillator();
      trem.frequency.value = 3 + Math.random() * 5;
      const tg = ctx.createGain();
      tg.gain.value = 0.04;
      const og = ctx.createGain();
      og.gain.value = 0.05;
      trem.connect(tg).connect(og.gain);
      o.connect(og).connect(this.shimmer);
      o.start();
      trem.start();
    }

    // Hum: resonant energy for the rings core and the pedestal halo.
    this.hum = layer();
    const hf = ctx.createBiquadFilter();
    hf.type = "lowpass";
    hf.frequency.value = 900;
    hf.connect(this.hum);
    this.humOscs = [];
    for (const [f, type, g] of [
      [110, "sine", 0.5],
      [165.2, "sine", 0.3],
      [220.4, "triangle", 0.12],
    ] as const) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = f;
      const og = ctx.createGain();
      og.gain.value = g;
      o.connect(og).connect(hf);
      o.start();
      this.humOscs.push({ osc: o, base: f });
    }
    const humLfo = ctx.createOscillator();
    humLfo.frequency.value = 0.4;
    const humLfoGain = ctx.createGain();
    humLfoGain.gain.value = 300;
    humLfo.connect(humLfoGain).connect(hf.frequency);
    humLfo.start();
  }

  /**
   * Per-frame mix of the animation layers. Values are 0..1 levels; this is
   * rate-limited internally so it is safe to call every frame.
   */
  update(levels: { rumble: number; shimmer: number; hum: number; humPitch?: number }) {
    const ctx = this.ctx;
    if (!ctx || !this.enabled || !this.rumble || !this.shimmer || !this.hum) return;
    const now = performance.now();
    if (now - this.lastUpdate < 50) return;
    this.lastUpdate = now;
    const t = ctx.currentTime;
    const c = (v: number) => Math.min(1, Math.max(0, v));
    this.rumble.gain.setTargetAtTime(c(levels.rumble) * 0.55, t, 0.12);
    this.rumbleFilter?.frequency.setTargetAtTime(110 + c(levels.rumble) * 260, t, 0.2);
    this.shimmer.gain.setTargetAtTime(c(levels.shimmer) * 0.32, t, 0.15);
    this.hum.gain.setTargetAtTime(c(levels.hum) * 0.16, t, 0.3);
    if (levels.humPitch !== undefined) {
      for (const h of this.humOscs) h.osc.frequency.setTargetAtTime(h.base * levels.humPitch, t, 0.6);
    }
  }

  async enable() {
    if (!this.ctx) this.build();
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    if (ctx.state === "suspended") await ctx.resume();
    this.enabled = true;
    const g = this.master.gain;
    g.cancelScheduledValues(ctx.currentTime);
    g.setTargetAtTime(0.9, ctx.currentTime, 0.6);
  }

  disable() {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    this.enabled = false;
    const g = this.master.gain;
    g.cancelScheduledValues(ctx.currentTime);
    g.setTargetAtTime(0, ctx.currentTime, 0.25);
  }

  /** 0..1 — opens the drone and wind as the experience intensifies. */
  setIntensity(x: number) {
    const ctx = this.ctx;
    if (!ctx || !this.enabled) return;
    const t = ctx.currentTime;
    this.droneFilter?.frequency.setTargetAtTime(200 + x * 900, t, 0.4);
    this.windFilter?.Q.setTargetAtTime(0.9 + x * 2.5, t, 0.5);
  }

  private env(duration: number, peak: number, attack = 0.004) {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    const t = ctx.currentTime;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    g.connect(this.sfxBus!);
    return g;
  }

  /** Short interface blip. */
  blip(kind: "hover" | "click" | "back" = "hover") {
    if (!this.enabled || !this.ctx) return;
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = kind === "click" ? "square" : "sine";
    const f = kind === "hover" ? 1760 : kind === "click" ? 880 : 660;
    o.frequency.setValueAtTime(f, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(f * (kind === "back" ? 0.5 : 1.5), ctx.currentTime + 0.08);
    const g = this.env(kind === "hover" ? 0.09 : 0.16, kind === "click" ? 0.05 : 0.06);
    o.connect(g);
    o.start();
    o.stop(ctx.currentTime + 0.2);
  }

  /** Rapid data ticks used while text decodes. Rate-limited. */
  tick() {
    if (!this.enabled || !this.ctx) return;
    const now = performance.now();
    if (now - this.lastTick < 28) return;
    this.lastTick = now;
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = "square";
    o.frequency.value = 2400 + Math.random() * 2400;
    const g = this.env(0.025, 0.012, 0.001);
    o.connect(g);
    o.start();
    o.stop(ctx.currentTime + 0.04);
  }

  /** Inharmonic glass bell. `index` picks a note from a minor pentatonic. */
  chime(index = 0, gain = 0.05) {
    if (!this.enabled || !this.ctx) return;
    const ctx = this.ctx;
    const scale = [0, 3, 5, 7, 10, 12, 15, 17];
    const f = 659.25 * Math.pow(2, scale[index % scale.length] / 12);
    const t = ctx.currentTime;
    for (const [ratio, amp, dur] of [
      [1, 1, 1.6],
      [2.76, 0.45, 0.9],
      [5.4, 0.25, 0.5],
    ] as const) {
      const o = ctx.createOscillator();
      o.frequency.value = f * ratio;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(gain * amp, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(this.sfxBus!);
      o.start(t);
      o.stop(t + dur + 0.05);
    }
  }

  /** Short noise burst through a resonant filter (glass crack / stone knock). */
  private burst(freq: number, q: number, dur: number, gain: number, delay = 0) {
    const ctx = this.ctx!;
    const t = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.sfxBus!);
    src.start(t, Math.random() * 1.5);
    src.stop(t + dur + 0.05);
  }

  /** Crystal dissolving into the case study. */
  shatter() {
    if (!this.enabled || !this.ctx) return;
    for (let i = 0; i < 14; i++) this.burst(2500 + Math.random() * 6000, 8, 0.12 + Math.random() * 0.2, 0.09, i * 0.035 + Math.random() * 0.03);
    [7, 5, 3, 0].forEach((n, i) => window.setTimeout(() => this.chime(n, 0.035), 80 + i * 110));
    this.whoosh(1.2, true);
  }

  /** Crystal re-forming when a case study closes. */
  reform() {
    if (!this.enabled || !this.ctx) return;
    for (let i = 0; i < 10; i++) this.burst(1800 + Math.random() * 4000, 10, 0.1, 0.06, 0.25 + i * 0.04);
    [0, 3, 5].forEach((n, i) => window.setTimeout(() => this.chime(n, 0.03), 350 + i * 90));
    this.whoosh(0.9, false);
  }

  /** Heavy stone segment locking into place. */
  thud(pitch = 1) {
    if (!this.enabled || !this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(95 * pitch, t);
    o.frequency.exponentialRampToValueAtTime(42 * pitch, t + 0.25);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.22, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
    o.connect(g).connect(this.sfxBus!);
    o.start(t);
    o.stop(t + 0.5);
    this.burst(600 * pitch, 2.5, 0.18, 0.12);
  }

  /** Particle sculpture scattering and reforming. */
  sparkle(duration = 1.1) {
    if (!this.enabled || !this.ctx) return;
    this.whoosh(duration, true);
    const n = 22;
    for (let i = 0; i < n; i++) {
      const at = Math.pow(i / n, 1.4) * duration * 1000;
      window.setTimeout(() => {
        if (!this.ctx) return;
        const o = this.ctx.createOscillator();
        o.frequency.value = 2600 + Math.random() * 3800;
        const g = this.env(0.06, 0.018, 0.002);
        o.connect(g);
        o.start();
        o.stop(this.ctx.currentTime + 0.08);
      }, at);
    }
  }

  /** Rising pentatonic arpeggio while the intro lattice draws itself. */
  arpeggio(steps = 10, spacingMs = 180) {
    if (!this.enabled || !this.ctx) return;
    for (let i = 0; i < steps; i++) window.setTimeout(() => this.chime(i, 0.022), i * spacingMs);
  }

  /** Filtered noise sweep for scene transitions. */
  whoosh(duration = 1.4, up = true) {
    if (!this.enabled || !this.ctx || !this.noise) return;
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = "bandpass";
    f.Q.value = 1.4;
    const t = ctx.currentTime;
    f.frequency.setValueAtTime(up ? 200 : 3200, t);
    f.frequency.exponentialRampToValueAtTime(up ? 3200 : 180, t + duration);
    const g = this.env(duration, 0.22, duration * 0.45);
    src.connect(f).connect(g);
    src.start();
    src.stop(t + duration + 0.1);

    // Sub-bass thump under the sweep.
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(90, t);
    o.frequency.exponentialRampToValueAtTime(32, t + 0.6);
    const og = this.env(0.7, 0.18, 0.01);
    o.connect(og);
    o.start();
    o.stop(t + 0.8);
  }
}

export const audio = new AudioEngine();
