// Playgama forbids `localStorage`, but the game reads its progress
// synchronously on start. The write-through store bridges the two: reads
// from a copy loaded up front, every change forwarded to the platform.
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  installWriteThroughStore,
  persistentStore,
  resetPersistentStore,
} from '../services/persistentStore';

afterEach(() => resetPersistentStore());

describe('write-through store', () => {
  it('reads what was loaded, and forwards each real change once', () => {
    const onWrite = vi.fn();
    installWriteThroughStore(new Map([['dozor.music_enabled', 'true']]), onWrite);
    const store = persistentStore();

    expect(store.getItem('dozor.music_enabled')).toBe('true');
    expect(store.getItem('dozor.level_stars_v1')).toBeNull();

    store.setItem('dozor.music_enabled', 'true');
    expect(onWrite).not.toHaveBeenCalled();

    store.setItem('dozor.music_enabled', 'false');
    store.removeItem('dozor.music_enabled');
    store.removeItem('dozor.music_enabled');
    expect(onWrite.mock.calls).toEqual([
      ['dozor.music_enabled', 'false'],
      ['dozor.music_enabled', null],
    ]);
    expect(store.getItem('dozor.music_enabled')).toBeNull();
  });

  it('does not touch the browser storage while installed', () => {
    window.localStorage.removeItem('dozor.music_volume');
    installWriteThroughStore(new Map(), () => {});
    persistentStore().setItem('dozor.music_volume', '0.4');
    expect(window.localStorage.getItem('dozor.music_volume')).toBeNull();
  });
});
