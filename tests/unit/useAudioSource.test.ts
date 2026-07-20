import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FileAnalysisState, MicrophoneState } from '../../src/app/audio/types';

let fileState: FileAnalysisState = { status: 'empty' };
const removeFileMock = vi.fn();
const selectFileMock = vi.fn();

let micState: MicrophoneState = { status: 'off' };
const stopMock = vi.fn();
const startMock = vi.fn();

vi.mock('../../src/app/hooks/useAudioFileAnalysis', () => ({
  useAudioFileAnalysis: () => ({
    state: fileState,
    durationSec: null,
    selectFile: selectFileMock,
    removeFile: removeFileMock,
  }),
}));

vi.mock('../../src/app/hooks/useMicrophoneBpm', () => ({
  useMicrophoneBpm: () => ({
    state: micState,
    start: startMock,
    stop: stopMock,
  }),
}));

import { useAudioSource } from '../../src/app/hooks/useAudioSource';

const fakeFile = new File([], 'track.mp3');
const fakeResult = { bpm: 120, confidence: 0.9, halfBpm: 60, doubleBpm: 240, source: 'file' as const };

beforeEach(() => {
  fileState = { status: 'empty' };
  micState = { status: 'off' };
  removeFileMock.mockReset();
  selectFileMock.mockReset();
  stopMock.mockReset();
  startMock.mockReset();
});

describe('useAudioSource', () => {
  it('defaults to the file source', () => {
    const { result } = renderHook(() => useAudioSource(120));
    expect(result.current.activeSource).toBe('file');
    expect(result.current.pendingSwitchTarget).toBeNull();
  });

  it('switches file -> microphone immediately when the file source is empty', () => {
    const { result, rerender } = renderHook(() => useAudioSource(120));
    act(() => result.current.requestSwitch('microphone'));
    rerender();
    expect(result.current.activeSource).toBe('microphone');
    expect(result.current.pendingSwitchTarget).toBeNull();
    expect(removeFileMock).not.toHaveBeenCalled();
  });

  it('switches microphone -> file immediately when the microphone is off', () => {
    fileState = { status: 'empty' };
    const { result, rerender } = renderHook(() => useAudioSource(120));
    act(() => result.current.requestSwitch('microphone'));
    rerender();
    act(() => result.current.requestSwitch('file'));
    rerender();
    expect(result.current.activeSource).toBe('file');
    expect(stopMock).not.toHaveBeenCalled();
  });

  it.each([
    ['decoding', { status: 'decoding', file: fakeFile } as FileAnalysisState],
    ['analyzing', { status: 'analyzing', file: fakeFile, stage: 'beats' } as FileAnalysisState],
    ['success', { status: 'success', file: fakeFile, result: fakeResult } as FileAnalysisState],
    ['error with a file reference', { status: 'error', file: fakeFile, message: 'x' } as FileAnalysisState],
  ])('requires confirmation to switch to microphone when file state is %s', (_label, state) => {
    fileState = state;
    const { result, rerender } = renderHook(() => useAudioSource(120));
    act(() => result.current.requestSwitch('microphone'));
    rerender();
    expect(result.current.activeSource).toBe('file');
    expect(result.current.pendingSwitchTarget).toBe('microphone');
  });

  it.each([
    ['requesting-permission', { status: 'requesting-permission' } as MicrophoneState],
    ['listening', { status: 'listening', startedAt: 1 } as MicrophoneState],
    ['stabilizing', { status: 'stabilizing', startedAt: 1, candidateBpm: 120 } as MicrophoneState],
    ['success', { status: 'success', result: { ...fakeResult, source: 'microphone' as const } } as MicrophoneState],
    ['error', { status: 'error', message: 'x' } as MicrophoneState],
  ])('requires confirmation to switch to file when microphone state is %s', (_label, state) => {
    // Start on microphone so requestSwitch('file') is the transition under test.
    const { result, rerender } = renderHook(() => useAudioSource(120));
    act(() => result.current.requestSwitch('microphone'));
    rerender();
    micState = state;
    // The mocked hook only re-reads `micState` on a fresh render, and
    // requestSwitch's closure was built at the previous render — force one
    // before invoking it so the new microphone state is actually observed.
    rerender();

    act(() => result.current.requestSwitch('file'));
    rerender();
    expect(result.current.activeSource).toBe('microphone');
    expect(result.current.pendingSwitchTarget).toBe('file');
  });

  it('cancelSwitch clears the pending target and leaves everything untouched', () => {
    fileState = { status: 'success', file: fakeFile, result: fakeResult };
    const { result, rerender } = renderHook(() => useAudioSource(120));
    act(() => result.current.requestSwitch('microphone'));
    rerender();
    expect(result.current.pendingSwitchTarget).toBe('microphone');

    act(() => result.current.cancelSwitch());
    rerender();
    expect(result.current.pendingSwitchTarget).toBeNull();
    expect(result.current.activeSource).toBe('file');
    expect(removeFileMock).not.toHaveBeenCalled();
  });

  it('confirmSwitch to microphone removes the file before switching', () => {
    fileState = { status: 'success', file: fakeFile, result: fakeResult };
    const { result, rerender } = renderHook(() => useAudioSource(120));
    act(() => result.current.requestSwitch('microphone'));
    rerender();

    act(() => result.current.confirmSwitch());
    rerender();

    expect(removeFileMock).toHaveBeenCalledTimes(1);
    expect(result.current.activeSource).toBe('microphone');
    expect(result.current.pendingSwitchTarget).toBeNull();
  });

  it('confirmSwitch to file stops the microphone before switching', () => {
    const { result, rerender } = renderHook(() => useAudioSource(120));
    act(() => result.current.requestSwitch('microphone'));
    rerender();
    micState = { status: 'listening', startedAt: 1 };
    rerender();

    act(() => result.current.requestSwitch('file'));
    rerender();
    act(() => result.current.confirmSwitch());
    rerender();

    expect(stopMock).toHaveBeenCalledTimes(1);
    expect(result.current.activeSource).toBe('file');
    expect(result.current.pendingSwitchTarget).toBeNull();
  });
});
