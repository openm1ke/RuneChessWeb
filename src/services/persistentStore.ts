/**
 * The one key-value store the game keeps its progress and settings in.
 *
 * On runechess.ru and in the Yandex Games build it is simply the browser's
 * `localStorage`. Playgama forbids that outright — its partner sites may
 * not keep a third-party frame's storage, and cloud saves only work through
 * `bridge.storage` — but `bridge.storage` answers with promises, while the
 * whole game reads its progress synchronously on start.
 *
 * So the Playgama build loads every key once before the app is drawn (see
 * `playgamaPlatform.ts`), and from then on reads come from that copy in
 * memory and every write is forwarded to the platform as well. The
 * repositories never know which of the two they are talking to.
 */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** Looked up on every call rather than captured once: a browser that
 * refuses storage throws on the property access itself, and the callers'
 * own try/catch is what turns that into "nothing saved". */
const browserStore: KeyValueStore = {
  getItem: (key) => window.localStorage.getItem(key),
  setItem: (key, value) => window.localStorage.setItem(key, value),
  removeItem: (key) => window.localStorage.removeItem(key),
};

let current: KeyValueStore = browserStore;

export function persistentStore(): KeyValueStore {
  return current;
}

/**
 * Switches the store to an in-memory copy of [initial], reporting every
 * change to [onWrite] (`null` for a removal) so the platform can keep it.
 */
export function installWriteThroughStore(
  initial: ReadonlyMap<string, string>,
  onWrite: (key: string, value: string | null) => void,
): void {
  const values = new Map(initial);
  current = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      if (values.get(key) === value) return;
      values.set(key, value);
      onWrite(key, value);
    },
    removeItem: (key) => {
      if (!values.has(key)) return;
      values.delete(key);
      onWrite(key, null);
    },
  };
}

/** Back to the browser's own storage — for tests. */
export function resetPersistentStore(): void {
  current = browserStore;
}
