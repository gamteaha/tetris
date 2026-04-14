/**
 * Web Audio API를 활용한 고양이 소리 엔진 (외부 파일 없음)
 * "미야옹"처럼 들리도록: WaveShaper로 따뜻한 배음 추가 + 정교한 포먼트 필터
 */
export class CatSoundManager {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;

  constructor() {}

  private initCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  /**
   * 고양이 울음 소리 합성 핵심 함수
   * freqCurve: [[시간(s), 주파수(Hz)], ...] 식으로 피치 곡선 정의
   * duration: 전체 재생 길이
   */
  private synthesizeMeow(
    freqCurve: [number, number][],
    duration: number,
    volume = 0.3
  ) {
    if (this.muted) return;
    this.initCtx();
    const ctx = this.ctx!;
    const now = ctx.currentTime;

    // 1. 주 오실레이터 (물렁물렁한 소리를 위해 triangle)
    const osc = ctx.createOscillator();
    osc.type = 'triangle';

    // 피치 커브 적용
    freqCurve.forEach(([t, freq], i) => {
      if (i === 0) {
        osc.frequency.setValueAtTime(freq, now + t);
      } else {
        // 자연스러운 슬라이드를 위해 linearRamp
        osc.frequency.linearRampToValueAtTime(freq, now + t);
      }
    });

    // 2. WaveShaper: 기계음을 부드럽게 만드는 소프트-클리핑 (따뜻한 배음)
    const shaper = ctx.createWaveShaper();
    const curve = new Float32Array(128);
    for (let i = 0; i < 128; i++) {
      const x = (i * 2) / 128 - 1;
      // tanh로 소프트 클리핑 → 기계적 각짐 제거
      curve[i] = Math.tanh(x * 2);
    }
    shaper.curve = curve;

    // 3. 포먼트 필터: 고양이 후두의 공명 느낌
    //    "미" 구간: 높은 공명(1.5kHz), "야" 구간: 열린 공명(800Hz 이하), "옹": 닫히는 느낌
    const formant = ctx.createBiquadFilter();
    formant.type = 'bandpass';
    formant.frequency.setValueAtTime(1200, now);
    formant.frequency.linearRampToValueAtTime(700, now + duration * 0.4);
    formant.frequency.linearRampToValueAtTime(500, now + duration);
    formant.Q.value = 3;

    // 4. 비브라토: 약간의 자연스러운 흔들림
    const vibratoOsc = ctx.createOscillator();
    const vibratoGain = ctx.createGain();
    vibratoOsc.type = 'sine';
    vibratoOsc.frequency.value = 6; // 6Hz 자연스러운 진동
    // 처음엔 거의 없다가 점점 강해지는 비브라토
    vibratoGain.gain.setValueAtTime(0, now);
    vibratoGain.gain.linearRampToValueAtTime(15, now + duration * 0.5);
    vibratoGain.gain.setValueAtTime(8, now + duration * 0.8);
    vibratoOsc.connect(vibratoGain);
    vibratoGain.connect(osc.frequency);

    // 5. 볼륨 엔벨로프 (ADSR)
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.04); // Attack
    gain.gain.setValueAtTime(volume, now + duration * 0.6); // Sustain
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration); // Release

    // 연결
    osc.connect(shaper);
    shaper.connect(formant);
    formant.connect(gain);
    gain.connect(ctx.destination);

    vibratoOsc.start(now);
    osc.start(now);
    vibratoOsc.stop(now + duration);
    osc.stop(now + duration);
  }

  /** 
   * 음원 파일 재생 (turn.mp3 전용)
   */
  async playTurn() {
    if (this.muted) return;
    this.initCtx();
    try {
      const response = await fetch('/turn.mp3');
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.ctx!.decodeAudioData(arrayBuffer);
      const source = this.ctx!.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.ctx!.destination);
      source.start();
    } catch (e) {
      console.error('Failed to play turn.mp3', e);
    }
  }

  /** 블록 착지: 가장 처음 구현했던 심플한 "냥!" (사인파 슬라이드) */
  playLand() {
    if (this.muted) return;
    this.initCtx();
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // 600Hz -> 400Hz (0.15초)
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  }


  /** 줄 완성: "미야옹~" (합성 버전 유지) */
  playClear() {
    if (this.muted) return;
    this.synthesizeMeow([
      [0,    420],  
      [0.08, 650],  
      [0.22, 750],  
      [0.4,  480],  
      [0.55, 320],  
    ], 0.7, 0.28);
  }

  /** 길게 "미야아아옹~~" */
  playMeowLong() {
    if (this.muted) return;
    this.synthesizeMeow([
      [0,    380],  
      [0.1,  600],  
      [0.3,  780],  
      [0.5,  720],  
      [0.7,  550],  
      [0.95, 350],  
    ], 1.1, 0.32);
  }


  playComplete() {
    if (this.muted) return;
    this.playMeowLong();
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  get isMuted() {
    return this.muted;
  }
}
