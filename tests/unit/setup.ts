import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});

// jsdom does not implement the Web Animations API. Unit tests only need
// enough of the Animation surface for the engine/hooks to drive lifecycle
// (play/pause/cancel/currentTime/effect.updateTiming) — geometry and real
// visual playback are covered by Playwright against a real browser.
class FakeAnimationEffect {
  timing: KeyframeAnimationOptions;
  constructor(timing: KeyframeAnimationOptions) {
    this.timing = timing;
  }
  updateTiming(timing: OptionalEffectTiming) {
    Object.assign(this.timing, timing);
  }
  getTiming() {
    return this.timing;
  }
}

class FakeAnimation {
  effect: FakeAnimationEffect;
  playState: AnimationPlayState = 'idle';
  playbackRate = 1;
  onfinish: (() => void) | null = null;
  private _currentTime = 0;
  readonly finished: Promise<FakeAnimation>;
  private resolveFinished!: (a: FakeAnimation) => void;

  constructor(
    public keyframes: unknown,
    options: KeyframeAnimationOptions,
  ) {
    this.effect = new FakeAnimationEffect(options);
    this.finished = new Promise((resolve) => {
      this.resolveFinished = resolve;
    });
  }

  get currentTime() {
    return this._currentTime;
  }

  set currentTime(v: number | null) {
    this._currentTime = v ?? 0;
  }

  play() {
    this.playState = 'running';
  }

  pause() {
    this.playState = 'paused';
  }

  cancel() {
    this.playState = 'idle';
    this._currentTime = 0;
  }

  finish() {
    this.playState = 'finished';
    this.onfinish?.();
    this.resolveFinished(this);
  }
}

type AnimatableProto = { animate?: (keyframes: unknown, options: KeyframeAnimationOptions) => Animation };
const elementProto = Element.prototype as unknown as AnimatableProto;
if (typeof Element !== 'undefined' && !elementProto.animate) {
  elementProto.animate = function animate(keyframes: unknown, options: KeyframeAnimationOptions) {
    return new FakeAnimation(keyframes, options) as unknown as Animation;
  };
}

if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}
