// The ads backend of the Playgama build.
//
// Bridge reports a rewarded ad as a stream of state events rather than per
// call, and only `rewarded` before `closed` means the player earned it — a
// game that rewards on `closed` is rejected for exactly that. Each outcome
// is a test below.
import { describe, expect, it, vi } from 'vitest';
import { type AnalyticsService } from '../services/analyticsService';
import type { PlaygamaBridge } from '../services/playgamaPlatform';
import { PlaygamaRewardedAdsService } from '../services/playgamaRewardedAdsService';

function analyticsSpy(): AnalyticsService {
  return {
    adRequested: vi.fn(),
    adShown: vi.fn(),
    adRewarded: vi.fn(),
    adClosedWithoutReward: vi.fn(),
    adShowFailed: vi.fn(),
  } as unknown as AnalyticsService;
}

/** A Bridge whose rewarded ad plays out the states the test hands it. */
function fakeBridge(states: string[], supported = true): PlaygamaBridge {
  let listener: (state: string) => void = () => {};
  return {
    EVENT_NAME: { REWARDED_STATE_CHANGED: 'rewarded_state_changed' },
    advertisement: {
      isRewardedSupported: supported,
      on: (_event: string, callback: (state: string) => void) => {
        listener = callback;
      },
      showRewarded: () => {
        for (const state of states) listener(state);
      },
    },
  } as unknown as PlaygamaBridge;
}

describe('PlaygamaRewardedAdsService', () => {
  it('rewards only after the platform says rewarded', async () => {
    const analytics = analyticsSpy();
    const service = new PlaygamaRewardedAdsService(
      fakeBridge(['loading', 'opened', 'rewarded', 'closed']),
      analytics,
    );
    await service.show('extraHint');
    expect(service.stateOf('extraHint')).toBe('rewarded');
    expect(analytics.adShown).toHaveBeenCalledWith('extra_hint');
    expect(analytics.adRewarded).toHaveBeenCalledWith('extra_hint');
  });

  it('a close without the reward grants nothing', async () => {
    const analytics = analyticsSpy();
    const service = new PlaygamaRewardedAdsService(fakeBridge(['loading', 'opened', 'closed']), analytics);
    await service.show('bonusStar');
    expect(service.stateOf('bonusStar')).toBe('closedWithoutReward');
    expect(analytics.adRewarded).not.toHaveBeenCalled();
  });

  it('a failed ad ends the attempt instead of leaving the button busy', async () => {
    const analytics = analyticsSpy();
    const service = new PlaygamaRewardedAdsService(fakeBridge(['loading', 'failed']), analytics);
    await service.show('skipLevel');
    expect(service.stateOf('skipLevel')).toBe('error');
    expect(analytics.adShowFailed).toHaveBeenCalledWith('skip_level', 'failed');
  });

  it('says so when the platform has no rewarded ads at all', async () => {
    const analytics = analyticsSpy();
    const service = new PlaygamaRewardedAdsService(fakeBridge([], false), analytics);
    await service.show('extraHint');
    expect(service.stateOf('extraHint')).toBe('unavailable');
    expect(analytics.adRequested).not.toHaveBeenCalled();
  });
});
