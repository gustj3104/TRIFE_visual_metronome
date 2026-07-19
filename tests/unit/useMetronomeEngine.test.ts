import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useMetronomeEngine } from '../../src/app/engine/useMetronomeEngine';

describe('useMetronomeEngine', () => {
  it('starts Ready, and start() moves to Playing at beat 0', () => {
    const { result } = renderHook(() => useMetronomeEngine());
    expect(result.current.status).toBe('Ready');

    act(() => {
      result.current.start();
    });

    expect(result.current.status).toBe('Playing');
    expect(result.current.beatNumber).toBe(0);
  });

  it('fires an immediate first-beat event on start, before any time elapses', () => {
    const { result } = renderHook(() => useMetronomeEngine());
    const events: { beatIndex: number; isFirstBeat: boolean }[] = [];

    act(() => {
      result.current.subscribeBeat((e) => events.push(e));
    });
    act(() => {
      result.current.start();
    });

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ beatIndex: 0, isFirstBeat: true });
  });

  it('pause() moves Playing -> Paused without resetting beatNumber', () => {
    const { result } = renderHook(() => useMetronomeEngine());
    act(() => result.current.start());
    act(() => result.current.pause());
    expect(result.current.status).toBe('Paused');
    expect(result.current.beatNumber).toBe(0);
  });

  it('start() from Paused (restart) resets back to beat 0 and Playing', () => {
    const { result } = renderHook(() => useMetronomeEngine());
    act(() => result.current.start());
    act(() => result.current.pause());
    act(() => result.current.start());
    expect(result.current.status).toBe('Playing');
    expect(result.current.beatNumber).toBe(0);
  });

  it('setBpm clamps to [40, 240] and rounds decimals', () => {
    const { result } = renderHook(() => useMetronomeEngine());
    act(() => result.current.setBpm(10));
    expect(result.current.bpm).toBe(40);
    act(() => result.current.setBpm(999));
    expect(result.current.bpm).toBe(240);
    act(() => result.current.setBpm(100.6));
    expect(result.current.bpm).toBe(101);
  });

  it('registerAnimation plays a registered animation immediately when already Playing', () => {
    const { result } = renderHook(() => useMetronomeEngine());
    act(() => result.current.start());

    const el = document.createElement('div');
    const anim = el.animate([{ transform: 'translate(0px)' }, { transform: 'translate(10px)' }], {
      duration: 500,
      iterations: Infinity,
    });
    // A freshly-created animation defaults to 'running'; registration should
    // still leave it playing (in sync) since the engine is already Playing.
    act(() => {
      result.current.registerAnimation(anim);
    });
    expect(anim.playState).toBe('running');
  });

  it('registerAnimation pauses a registered animation when not Playing', () => {
    const { result } = renderHook(() => useMetronomeEngine());
    const el = document.createElement('div');
    const anim = el.animate([{ transform: 'translate(0px)' }, { transform: 'translate(10px)' }], {
      duration: 500,
      iterations: Infinity,
    });
    act(() => {
      result.current.registerAnimation(anim);
    });
    expect(anim.playState).toBe('paused');
  });

  it('pause() pauses all registered animations, keeping visual position frozen', () => {
    const { result } = renderHook(() => useMetronomeEngine());
    act(() => result.current.start());
    const el = document.createElement('div');
    const anim = el.animate([{ transform: 'translate(0px)' }, { transform: 'translate(10px)' }], {
      duration: 500,
      iterations: Infinity,
    });
    act(() => result.current.registerAnimation(anim));
    expect(anim.playState).toBe('running');

    act(() => result.current.pause());
    expect(anim.playState).toBe('paused');
  });

  it('unregisterAnimation stops the engine from controlling it on the next transition', () => {
    const { result } = renderHook(() => useMetronomeEngine());
    const el = document.createElement('div');
    const anim = el.animate([{ transform: 'translate(0px)' }, { transform: 'translate(10px)' }], {
      duration: 500,
      iterations: Infinity,
    });
    let unregister: () => void = () => {};
    act(() => {
      unregister = result.current.registerAnimation(anim);
    });
    act(() => unregister());
    anim.pause();
    act(() => result.current.start());
    // Engine no longer knows about this animation, so start() should not
    // have force-played it.
    expect(anim.playState).toBe('paused');
  });
});
