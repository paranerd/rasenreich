/**
 * Schmale Speicherschnittstelle für den Spielstand.
 *
 * Im Browser liegt der Stand im `localStorage`. In einer nativen Hülle
 * (Capacitor) übernimmt das später `@capacitor/preferences` — dessen API ist
 * asynchron, deshalb ist diese Schnittstelle es ebenfalls. Der Rest des Spiels
 * kennt nur `getSaveStorage()` und muss beim Wechsel nicht angefasst werden.
 */
export interface SaveStorage {
  read(key: string): Promise<string | null>;
  write(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

/**
 * Rückfallebene, wenn kein `localStorage` verfügbar ist — privater Modus,
 * abgeschaltete Website-Daten oder eine WebView ohne Speicherrechte. Das Spiel
 * läuft dann für die Sitzung weiter, nur überlebt der Stand sie nicht.
 */
function createMemoryStorage(): SaveStorage {
  const values = new Map<string, string>();
  return {
    async read(key) {
      return values.get(key) ?? null;
    },
    async write(key, value) {
      values.set(key, value);
    },
    async remove(key) {
      values.delete(key);
    },
  };
}

function isLocalStorageUsable(): boolean {
  try {
    const probe = '__gg_probe__';
    window.localStorage.setItem(probe, probe);
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

export function createBrowserStorage(): SaveStorage {
  if (typeof window === 'undefined' || !isLocalStorageUsable()) {
    return createMemoryStorage();
  }
  return {
    async read(key) {
      return window.localStorage.getItem(key);
    },
    async write(key, value) {
      window.localStorage.setItem(key, value);
    },
    async remove(key) {
      window.localStorage.removeItem(key);
    },
  };
}

let storage: SaveStorage | null = null;

export function getSaveStorage(): SaveStorage {
  storage ??= createBrowserStorage();
  return storage;
}

/**
 * Tauscht die Ablage aus — gedacht für den Start der nativen App, bevor das
 * Spiel gemountet wird, und für Tests.
 */
export function setSaveStorage(next: SaveStorage): void {
  storage = next;
}
