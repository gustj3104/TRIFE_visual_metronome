export type FileAnalysisErrorCode =
  | 'file-too-large'
  | 'unsupported-type'
  | 'decode-failed'
  | 'no-audio-channel'
  | 'too-short'
  | 'no-stable-bpm'
  | 'canceled';

export type MicrophoneErrorCode =
  | 'insecure-context'
  | 'permission-denied'
  | 'no-input-device'
  | 'device-busy'
  | 'unsupported'
  | 'audio-context-failed'
  | 'signal-too-low'
  | 'input-too-loud'
  | 'no-stable-bpm';

export class FileAnalysisError extends Error {
  constructor(public readonly code: FileAnalysisErrorCode) {
    super(code);
    this.name = 'FileAnalysisError';
  }
}

export class MicrophoneAnalysisError extends Error {
  constructor(public readonly code: MicrophoneErrorCode) {
    super(code);
    this.name = 'MicrophoneAnalysisError';
  }
}

export function fileErrorMessage(code: FileAnalysisErrorCode): string {
  switch (code) {
    case 'file-too-large':
      return 'This file is too large.\nChoose a file smaller than 50 MB.';
    case 'unsupported-type':
      return 'This file format is not supported.\nUse MP3, WAV, M4A, AAC, or OGG.';
    case 'decode-failed':
      return 'This audio file could not be decoded.\nTry a different file or format.';
    case 'no-audio-channel':
      return 'No usable audio was found in this file.\nTry a different file.';
    case 'too-short':
      return 'This file is too short to analyze.\nUse a longer audio clip.';
    case 'no-stable-bpm':
      return 'No stable beat was detected.\nTry a file with a clearer, steady beat.';
    case 'canceled':
      return 'Analysis was canceled.';
  }
}

export function microphoneErrorMessage(code: MicrophoneErrorCode): string {
  switch (code) {
    case 'insecure-context':
      return 'Microphone access requires a secure (HTTPS) connection.\nLoad this page over HTTPS and try again.';
    case 'permission-denied':
      return 'Microphone permission was denied.\nAllow microphone access in your browser settings and try again.';
    case 'no-input-device':
      return 'No microphone was found.\nConnect a microphone and try again.';
    case 'device-busy':
      return 'The microphone is in use by another application.\nClose other apps using it and try again.';
    case 'unsupported':
      return 'This browser does not support microphone input.\nTry a recent version of Chrome, Edge, or Firefox.';
    case 'audio-context-failed':
      return 'Audio processing could not be started.\nReload the page and try again.';
    case 'signal-too-low':
      return 'The microphone signal is too quiet.\nMove closer to the speaker and try again.';
    case 'input-too-loud':
      return 'The microphone signal is clipping (too loud).\nMove away from the speaker or lower the volume and try again.';
    case 'no-stable-bpm':
      return 'No stable beat detected.\nMove closer to the speaker or use an audio file.';
  }
}

export function mapGetUserMediaError(err: unknown): MicrophoneAnalysisError {
  const name = err instanceof DOMException ? err.name : '';
  switch (name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
    case 'SecurityError':
      return new MicrophoneAnalysisError('permission-denied');
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return new MicrophoneAnalysisError('no-input-device');
    case 'NotReadableError':
    case 'TrackStartError':
      return new MicrophoneAnalysisError('device-busy');
    default:
      return new MicrophoneAnalysisError('unsupported');
  }
}
