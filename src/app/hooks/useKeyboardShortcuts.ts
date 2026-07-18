import { useEffect } from 'react';

export interface KeyboardShortcutHandlers {
  togglePlay: () => void;
  adjustBpm: (delta: number) => void;
  toggleFullscreen: () => void;
  togglePanel: () => void;
}

/** Global keyboard shortcuts: Space (play/pause), arrows (BPM), F (fullscreen), C (panel). */
export function useKeyboardShortcuts(handlers: KeyboardShortcutHandlers): void {
  const { togglePlay, adjustBpm, toggleFullscreen, togglePanel } = handlers;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return;

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowRight') {
        adjustBpm(e.shiftKey ? 5 : 1);
      } else if (e.code === 'ArrowLeft') {
        adjustBpm(e.shiftKey ? -5 : -1);
      } else if (e.code === 'KeyF') {
        toggleFullscreen();
      } else if (e.code === 'KeyC') {
        togglePanel();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [togglePlay, adjustBpm, toggleFullscreen, togglePanel]);
}
