import { beforeEach, describe, expect, it, vi } from 'vitest';

const createRealtimeBpmAnalyzerMock = vi.fn();
vi.mock('realtime-bpm-analyzer', () => ({
  createRealtimeBpmAnalyzer: (...args: unknown[]) =>
    (createRealtimeBpmAnalyzerMock as (...a: unknown[]) => unknown)(...args),
}));

import { createRbpmLiveAnalyzer } from '../../src/app/audio/rbpm/rbpmLiveAnalyzer';

type Listener = (data: unknown) => void;

function makeFakeAnalyzer() {
  const listeners = new Map<string, Listener>();
  const node = { connectCalls: 0 };
  return {
    node,
    on: vi.fn((event: string, listener: Listener) => {
      listeners.set(event, listener);
    }),
    stop: vi.fn(),
    disconnect: vi.fn(),
    reset: vi.fn(),
    emit: (event: string, data: unknown) => listeners.get(event)?.(data),
  };
}

function makeSourceNode(shouldThrowOnConnect = false) {
  return {
    connect: vi.fn(() => {
      if (shouldThrowOnConnect) throw new Error('connect failed');
    }),
  } as unknown as AudioNode;
}

beforeEach(() => {
  createRealtimeBpmAnalyzerMock.mockReset();
});

describe('createRbpmLiveAnalyzer', () => {
  it('forwards bpm/bpmStable events as normalized estimates', async () => {
    const fakeAnalyzer = makeFakeAnalyzer();
    createRealtimeBpmAnalyzerMock.mockResolvedValue(fakeAnalyzer);
    const onEstimate = vi.fn();
    const onError = vi.fn();

    await createRbpmLiveAnalyzer({} as AudioContext, makeSourceNode(), { onEstimate, onError });

    fakeAnalyzer.emit('bpm', { bpm: [{ tempo: 120, count: 10, confidence: 0.8 }], threshold: 0.5 });
    expect(onEstimate).toHaveBeenCalledWith(expect.objectContaining({ bpm: 120 }), false);

    fakeAnalyzer.emit('bpmStable', { bpm: [{ tempo: 120, count: 10, confidence: 0.8 }], threshold: 0.5 });
    expect(onEstimate).toHaveBeenCalledWith(expect.objectContaining({ bpm: 120 }), true);
    expect(onError).not.toHaveBeenCalled();
  });

  it('forwards worklet error events without throwing', async () => {
    const fakeAnalyzer = makeFakeAnalyzer();
    createRealtimeBpmAnalyzerMock.mockResolvedValue(fakeAnalyzer);
    const onError = vi.fn();

    await createRbpmLiveAnalyzer({} as AudioContext, makeSourceNode(), { onEstimate: vi.fn(), onError });
    const err = new Error('worklet crashed');
    fakeAnalyzer.emit('error', { message: 'boom', error: err });
    expect(onError).toHaveBeenCalledWith(err);
  });

  it('falls back to a no-op handle when the worklet fails to load, without throwing', async () => {
    createRealtimeBpmAnalyzerMock.mockRejectedValue(new Error('addModule failed'));
    const onError = vi.fn();

    const handle = await createRbpmLiveAnalyzer({} as AudioContext, makeSourceNode(), { onEstimate: vi.fn(), onError });
    expect(onError).toHaveBeenCalled();
    expect(() => handle.stop()).not.toThrow();
    expect(() => handle.reset()).not.toThrow();
  });

  it('falls back to a no-op handle when connecting the source node fails', async () => {
    const fakeAnalyzer = makeFakeAnalyzer();
    createRealtimeBpmAnalyzerMock.mockResolvedValue(fakeAnalyzer);
    const onError = vi.fn();

    const handle = await createRbpmLiveAnalyzer({} as AudioContext, makeSourceNode(true), {
      onEstimate: vi.fn(),
      onError,
    });
    expect(fakeAnalyzer.stop).toHaveBeenCalled();
    expect(onError).toHaveBeenCalled();
    expect(() => handle.stop()).not.toThrow();
  });

  it('ignores late events after stop()', async () => {
    const fakeAnalyzer = makeFakeAnalyzer();
    createRealtimeBpmAnalyzerMock.mockResolvedValue(fakeAnalyzer);
    const onEstimate = vi.fn();

    const handle = await createRbpmLiveAnalyzer({} as AudioContext, makeSourceNode(), { onEstimate, onError: vi.fn() });
    handle.stop();
    fakeAnalyzer.emit('bpm', { bpm: [{ tempo: 120, count: 10, confidence: 0.8 }], threshold: 0.5 });
    expect(onEstimate).not.toHaveBeenCalled();
  });

  it('reset() restarts the analyzed-duration clock and delegates to the underlying analyzer', async () => {
    const fakeAnalyzer = makeFakeAnalyzer();
    createRealtimeBpmAnalyzerMock.mockResolvedValue(fakeAnalyzer);

    const handle = await createRbpmLiveAnalyzer({} as AudioContext, makeSourceNode(), { onEstimate: vi.fn(), onError: vi.fn() });
    handle.reset();
    expect(fakeAnalyzer.reset).toHaveBeenCalledTimes(1);
  });
});
