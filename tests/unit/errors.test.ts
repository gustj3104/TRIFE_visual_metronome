import { describe, expect, it } from 'vitest';
import { fileErrorMessage, mapGetUserMediaError, microphoneErrorMessage } from '../../src/app/audio/errors';

describe('mapGetUserMediaError', () => {
  it('maps NotAllowedError/PermissionDeniedError/SecurityError to permission-denied', () => {
    expect(mapGetUserMediaError(new DOMException('x', 'NotAllowedError')).code).toBe('permission-denied');
    expect(mapGetUserMediaError(new DOMException('x', 'PermissionDeniedError')).code).toBe('permission-denied');
    expect(mapGetUserMediaError(new DOMException('x', 'SecurityError')).code).toBe('permission-denied');
  });

  it('maps NotFoundError/DevicesNotFoundError to no-input-device', () => {
    expect(mapGetUserMediaError(new DOMException('x', 'NotFoundError')).code).toBe('no-input-device');
    expect(mapGetUserMediaError(new DOMException('x', 'DevicesNotFoundError')).code).toBe('no-input-device');
  });

  it('maps NotReadableError/TrackStartError to device-busy', () => {
    expect(mapGetUserMediaError(new DOMException('x', 'NotReadableError')).code).toBe('device-busy');
    expect(mapGetUserMediaError(new DOMException('x', 'TrackStartError')).code).toBe('device-busy');
  });

  it('falls back to unsupported for unrecognized or non-DOMException errors', () => {
    expect(mapGetUserMediaError(new DOMException('x', 'AbortError')).code).toBe('unsupported');
    expect(mapGetUserMediaError(new Error('boom')).code).toBe('unsupported');
    expect(mapGetUserMediaError('boom').code).toBe('unsupported');
  });
});

describe('fileErrorMessage / microphoneErrorMessage', () => {
  it('returns a distinct, user-actionable message for every file error code', () => {
    const codes = ['file-too-large', 'unsupported-type', 'decode-failed', 'no-audio-channel', 'too-short', 'no-stable-bpm', 'canceled'] as const;
    const messages = codes.map(fileErrorMessage);
    expect(new Set(messages).size).toBe(codes.length);
    messages.forEach((m) => expect(m.length).toBeGreaterThan(0));
  });

  it('returns a distinct, user-actionable message for every microphone error code', () => {
    const codes = [
      'insecure-context',
      'permission-denied',
      'no-input-device',
      'device-busy',
      'unsupported',
      'audio-context-failed',
      'signal-too-low',
      'no-stable-bpm',
    ] as const;
    const messages = codes.map(microphoneErrorMessage);
    expect(new Set(messages).size).toBe(codes.length);
    messages.forEach((m) => expect(m.length).toBeGreaterThan(0));
  });
});
