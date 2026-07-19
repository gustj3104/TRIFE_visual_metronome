import { act, render, screen } from '@testing-library/react';
import { useRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { shouldEmphasizeBeat, useBeatEmphasis } from '../../src/app/hooks/useBeatEmphasis';
import type { MetronomeEngine } from '../../src/app/engine/useMetronomeEngine';
import type { BeatEvent, BeatListener } from '../../src/app/engine/types';

function createFakeEngine() {
  let listener: BeatListener | null = null;
  const engine: MetronomeEngine = {
    status: 'Playing',
    bpm: 120,
    countMode: '4/4',
    totalBeats: 4,
    beatNumber: 0,
    start: () => {},
    pause: () => {},
    setBpm: () => {},
    setCountMode: () => {},
    subscribeBeat: (l) => {
      listener = l;
      return () => {
        listener = null;
      };
    },
    registerAnimation: () => () => {},
    getBeatDurationMs: () => 500,
  };
  return { engine, emit: (e: BeatEvent) => listener?.(e) };
}

function Harness({ engine, enabled }: { engine: MetronomeEngine; enabled: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const state = useBeatEmphasis(ref, engine, enabled, {
    buildKeyframes: () => [{ transform: 'scale(1)' }, { transform: 'scale(1.4)' }, { transform: 'scale(1)' }],
  });
  return <div ref={ref} data-testid="target" data-emphasis-state={state} />;
}

describe('shouldEmphasizeBeat (pure policy)', () => {
  it('emphasizes only when enabled AND it is the first beat', () => {
    expect(shouldEmphasizeBeat(true, true)).toBe(true);
    expect(shouldEmphasizeBeat(true, false)).toBe(false);
    expect(shouldEmphasizeBeat(false, true)).toBe(false);
    expect(shouldEmphasizeBeat(false, false)).toBe(false);
  });
});

describe('useBeatEmphasis', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('On + first beat: creates an emphasis animation and marks state "first"', () => {
    const animateSpy = vi.spyOn(Element.prototype, 'animate');
    const { engine, emit } = createFakeEngine();
    render(<Harness engine={engine} enabled />);

    act(() => emit({ beatIndex: 0, isFirstBeat: true, timestamp: 0 }));

    expect(screen.getByTestId('target')).toHaveAttribute('data-emphasis-state', 'first');
    expect(animateSpy).toHaveBeenCalledTimes(1);
  });

  it('On + non-first beat: no animation is created', () => {
    const animateSpy = vi.spyOn(Element.prototype, 'animate');
    const { engine, emit } = createFakeEngine();
    render(<Harness engine={engine} enabled />);

    act(() => emit({ beatIndex: 1, isFirstBeat: false, timestamp: 0 }));

    expect(screen.getByTestId('target')).toHaveAttribute('data-emphasis-state', 'none');
    expect(animateSpy).not.toHaveBeenCalled();
  });

  it('Off + first beat: no animation is created', () => {
    const animateSpy = vi.spyOn(Element.prototype, 'animate');
    const { engine, emit } = createFakeEngine();
    render(<Harness engine={engine} enabled={false} />);

    act(() => emit({ beatIndex: 0, isFirstBeat: true, timestamp: 0 }));

    expect(screen.getByTestId('target')).toHaveAttribute('data-emphasis-state', 'none');
    expect(animateSpy).not.toHaveBeenCalled();
  });

  it('Off + non-first beat: no animation is created', () => {
    const animateSpy = vi.spyOn(Element.prototype, 'animate');
    const { engine, emit } = createFakeEngine();
    render(<Harness engine={engine} enabled={false} />);

    act(() => emit({ beatIndex: 1, isFirstBeat: false, timestamp: 0 }));

    expect(screen.getByTestId('target')).toHaveAttribute('data-emphasis-state', 'none');
    expect(animateSpy).not.toHaveBeenCalled();
  });

  it('finishing the emphasis animation restores scale(1) and state "none"', () => {
    const animateSpy = vi.spyOn(Element.prototype, 'animate');
    const { engine, emit } = createFakeEngine();
    render(<Harness engine={engine} enabled />);

    act(() => emit({ beatIndex: 0, isFirstBeat: true, timestamp: 0 }));
    const anim = animateSpy.mock.results[0]?.value as Animation;
    act(() => anim.finish());

    expect(screen.getByTestId('target')).toHaveAttribute('data-emphasis-state', 'none');
    expect(screen.getByTestId('target').style.transform).toBe('scale(1)');
  });

  it('On -> Off mid-emphasis cancels immediately and restores scale(1)', () => {
    const { engine, emit } = createFakeEngine();
    const { rerender } = render(<Harness engine={engine} enabled />);

    act(() => emit({ beatIndex: 0, isFirstBeat: true, timestamp: 0 }));
    expect(screen.getByTestId('target')).toHaveAttribute('data-emphasis-state', 'first');

    rerender(<Harness engine={engine} enabled={false} />);

    expect(screen.getByTestId('target')).toHaveAttribute('data-emphasis-state', 'none');
    expect(screen.getByTestId('target').style.transform).toBe('scale(1)');
  });

  it('Off -> On does not retroactively emphasize the current beat, only the next first beat', () => {
    const { engine, emit } = createFakeEngine();
    const { rerender } = render(<Harness engine={engine} enabled={false} />);

    act(() => emit({ beatIndex: 1, isFirstBeat: false, timestamp: 0 }));
    expect(screen.getByTestId('target')).toHaveAttribute('data-emphasis-state', 'none');

    rerender(<Harness engine={engine} enabled />);
    // No retroactive emphasis just from toggling on.
    expect(screen.getByTestId('target')).toHaveAttribute('data-emphasis-state', 'none');

    act(() => emit({ beatIndex: 0, isFirstBeat: true, timestamp: 500 }));
    expect(screen.getByTestId('target')).toHaveAttribute('data-emphasis-state', 'first');
  });
});
