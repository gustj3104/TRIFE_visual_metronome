import { useCallback, useEffect, useState } from 'react';

export interface FullscreenApi {
  isFullscreen: boolean;
  fullscreenSupported: boolean;
  toggleFullscreen: () => void;
}

export function useFullscreen(): FullscreenApi {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenSupported, setFullscreenSupported] = useState(true);

  const toggleFullscreen = useCallback(() => {
    try {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      } else {
        document.documentElement.requestFullscreen().catch(() => {
          setFullscreenSupported(false);
        });
      }
    } catch {
      setFullscreenSupported(false);
    }
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  return { isFullscreen, fullscreenSupported, toggleFullscreen };
}
