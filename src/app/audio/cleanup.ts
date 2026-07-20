export function stopMediaStreamTracks(stream: MediaStream): void {
  stream.getTracks().forEach((track) => track.stop());
}

export function revokeObjectUrlIfPresent(url: string | null | undefined): void {
  if (url) URL.revokeObjectURL(url);
}

export function closeAudioContextIfNotClosed(context: AudioContext | null | undefined): void {
  if (context && context.state !== 'closed') {
    context.close().catch(() => {});
  }
}
