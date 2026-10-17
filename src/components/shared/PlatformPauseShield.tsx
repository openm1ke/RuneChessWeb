import { useEffect } from 'react';
import { usePlatformPaused } from './usePlatformPaused';

/**
 * While the platform has the game paused, nothing in it moves or answers:
 * a layer over everything takes every tap, and the page's CSS animations —
 * the held piece's sway, coins, glows — stop where they are (see
 * `.rc-platform-paused` in global.css). The beams' own loop stops in
 * GameScreen, and the attempt's clock in the engine.
 */
export function PlatformPauseShield() {
  const paused = usePlatformPaused();
  useEffect(() => {
    document.documentElement.classList.toggle('rc-platform-paused', paused);
  }, [paused]);
  if (!paused) return null;
  return (
    <div
      aria-hidden="true"
      onPointerDown={(event) => event.preventDefault()}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2147483000,
        background: 'rgba(6, 10, 24, 0.45)',
        touchAction: 'none',
      }}
    />
  );
}
