import { useMemo, useSyncExternalStore } from 'react';
import { DozorEngine } from './dozorEngine';

/**
 * Subscribes a React component tree to a `DozorEngine` instance, re-rendering
 * whenever the engine notifies a change (equivalent to wrapping the Flutter
 * `ChangeNotifier` in an `AnimatedBuilder`).
 */
export function useDozorEngine(engine: DozorEngine) {
  const snapshot = useSyncExternalStore(engine.subscribe, () => engine.snapshot());
  return useMemo(() => ({ engine, snapshot }), [engine, snapshot]);
}
