// Playgama's sandbox pauses the game when a rewarded video opens and never
// sends the matching resume when it closes. The pause shield then sat over
// the game for good. A pause that began during an ad now ends with the ad,
// and a tap on the shield ends a pause whose resume never came.
import { describe, expect, it, vi } from 'vitest';
import {
  isPlaygamaPaused,
  resumePlaygamaFromTap,
  startPlaygama,
  watchPlaygamaPauseAndAudio,
  type PlaygamaBridge,
} from '../services/playgamaPlatform';
import { resetPersistentStore } from '../services/persistentStore';

describe('the Playgama pause around an ad', () => {
  it('ends with the ad, and a stray pause yields to a tap', async () => {
    const platformListeners: Record<string, (value: boolean) => void> = {};
    const adListeners: Record<string, (state: string) => void> = {};
    window.bridge = {
      initialize: () => Promise.resolve(),
      EVENT_NAME: {
        PAUSE_STATE_CHANGED: 'pause',
        AUDIO_STATE_CHANGED: 'audio',
        REWARDED_STATE_CHANGED: 'rewarded',
        INTERSTITIAL_STATE_CHANGED: 'interstitial',
      },
      platform: {
        isAudioEnabled: true,
        on: (event: string, cb: (value: boolean) => void) => {
          platformListeners[event] = cb;
        },
      },
      storage: { get: () => Promise.resolve([]) },
      advertisement: {
        on: (event: string, cb: (state: string) => void) => {
          adListeners[event] = cb;
        },
      },
    } as unknown as PlaygamaBridge;
    await startPlaygama([]);
    const onResume = vi.fn();
    watchPlaygamaPauseAndAudio({ onSilence: vi.fn(), onRestore: vi.fn(), onPause: vi.fn(), onResume });

    adListeners.rewarded('loading');
    platformListeners.pause(true);
    // The ad covers the game itself: no shield of ours on top of it.
    expect(isPlaygamaPaused()).toBe(false);
    adListeners.rewarded('opened');
    adListeners.rewarded('rewarded');
    adListeners.rewarded('closed');
    // No resume from the platform, and none needed.
    expect(isPlaygamaPaused()).toBe(false);
    expect(onResume).toHaveBeenCalledTimes(1);

    // A real pause outside any ad still holds the game...
    await new Promise((resolve) => setTimeout(resolve, 1600));
    platformListeners.pause(true);
    expect(isPlaygamaPaused()).toBe(true);
    // ...until the platform lets go, or the player taps a game that is
    // plainly no longer covered.
    resumePlaygamaFromTap();
    expect(isPlaygamaPaused()).toBe(false);

    delete window.bridge;
    resetPersistentStore();
  });
});
