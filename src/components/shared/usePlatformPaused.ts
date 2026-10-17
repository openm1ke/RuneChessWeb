import { useSyncExternalStore } from 'react';
import { isPlaygamaPaused, subscribePlaygamaPause } from '../../services/playgamaPlatform';

/** True while the platform has the game paused. Always false outside the
 * Playgama build, where nothing ever changes it. */
export function usePlatformPaused(): boolean {
  return useSyncExternalStore(subscribePlaygamaPause, isPlaygamaPaused, isPlaygamaPaused);
}
