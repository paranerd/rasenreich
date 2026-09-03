'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  acceptOffer,
  cancelTask,
  createInitialState,
  declineOffer,
  GameResult,
  GameState,
  hireWorker,
  installChemistry,
  installEquipment,
  migrateState,
  OfflineSummary,
  resolveEvent,
  simulateGame,
  startAutomationIntervention,
  startTask,
  TaskKind,
  terminateContract,
  unlockChemistry,
  unlockEquipment,
} from '@/lib/game';
import { getSaveStorage } from '@/lib/storage';

const STORAGE_KEY = 'rasenreich-save-v1';
const LEGACY_STORAGE_KEY = 'garden-grinder-save-v1';

/** Fluechtige Meldung im Toast-Stapel. Ereignisse kommen aus dem Spielstand und bleiben stehen. */
export interface Toast {
  id: string;
  text: string;
  tone: 'info' | 'good' | 'warning';
  duration: number;
}

const TOAST_DURATION = 4_000;
const MAX_TOASTS = 3;

/**
 * Der Simulationstakt. Fein genug, dass die Werte während einer Aufgabe
 * fließen statt zu springen, und dass eine Phasengrenze auf den Frame genau
 * sichtbar wird. Gespeichert wird bewusst seltener.
 */
const TICK_MS = 200;
const SAVE_INTERVAL_MS = 1_000;

interface RasenreichDevCheats {
  addMoney: (amount?: number) => void;
  setMoney: (amount: number) => void;
  addReputation: (amount?: number) => void;
  setReputation: (amount: number) => void;
  help: () => string;
}

declare global {
  interface Window {
    rasenreich?: RasenreichDevCheats;
  }
}

function finiteCheatValue(value: number, name: string) {
  if (!Number.isFinite(value)) {
    throw new TypeError(`${name} muss eine endliche Zahl sein.`);
  }
  return value;
}

let devCheatsAnnounced = false;

export function useGame() {
  const [game, setGame] = useState<GameState | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const pendingMessage = useRef<string | undefined>(undefined);
  const [offlineSummary, setOfflineSummary] = useState<OfflineSummary | null>(
    null,
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  // Die Standzeit laeuft im Toast selbst ab — hier entsteht nur der Eintrag.
  const showToast = useCallback(
    (text?: string, tone: Toast['tone'] = 'info') => {
      if (!text) return;
      const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((current) =>
        [...current, { id, text, tone, duration: TOAST_DURATION }].slice(
          -MAX_TOASTS,
        ),
      );
    },
    [],
  );

  useEffect(() => {
    // Das Laden ist asynchron, weil die native Ablage es ist. Der Abbruch
    // verhindert, dass ein spaeter eintreffender Stand einen bereits
    // ausgehaengten Betrieb ueberschreibt.
    let cancelled = false;

    const load = async () => {
      let initial = createInitialState();
      let summary: OfflineSummary | null = null;
      let broken = false;

      try {
        const saveStorage = getSaveStorage();
        const currentSave = await saveStorage.read(STORAGE_KEY);
        const legacySave = currentSave
          ? null
          : await saveStorage.read(LEGACY_STORAGE_KEY);
        const saved = currentSave ?? legacySave;
        if (saved) {
          const migrated = migrateState(JSON.parse(saved) as GameState);
          if (migrated) {
            const result = simulateGame(migrated, Date.now(), true);
            initial = result.state;
            if (result.summary.elapsedMs >= 60_000) summary = result.summary;
            if (legacySave) {
              await saveStorage.write(
                STORAGE_KEY,
                JSON.stringify(result.state),
              );
              await saveStorage.remove(LEGACY_STORAGE_KEY);
            }
          }
        }
      } catch {
        broken = true;
      }

      if (cancelled) return;
      if (broken) {
        showToast(
          'Der alte Spielstand war nicht lesbar. Ein neuer Betrieb wurde gestartet.',
          'warning',
        );
      }
      if (summary) setOfflineSummary(summary);
      setGame(initial);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [showToast]);

  // Der Takt läuft fünfmal je Sekunde, geschrieben wird höchstens einmal —
  // localStorage ist synchron und hat im Spieltakt nichts zu suchen.
  const pendingSave = useRef<GameState | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushSave = useCallback(() => {
    const snapshot = pendingSave.current;
    if (!snapshot) return;
    pendingSave.current = null;
    void getSaveStorage().write(STORAGE_KEY, JSON.stringify(snapshot));
  }, []);

  useEffect(() => {
    if (!game) return;
    pendingSave.current = game;
    if (saveTimer.current) return;
    saveTimer.current = setTimeout(() => {
      saveTimer.current = null;
      flushSave();
    }, SAVE_INTERVAL_MS);
  }, [game, flushSave]);

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') flushSave();
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', flushSave);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', flushSave);
      flushSave();
    };
  }, [flushSave]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setGame((current) => (current ? simulateGame(current).state : current));
    }, TICK_MS);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!import.meta.env.DEV) return;

    const cheats: RasenreichDevCheats = {
      addMoney: (amount = 10_000) => {
        const value = finiteCheatValue(amount, 'amount');
        setGame((current) =>
          current
            ? { ...current, money: Math.max(0, current.money + value) }
            : current,
        );
      },
      setMoney: (amount) => {
        const value = finiteCheatValue(amount, 'amount');
        setGame((current) =>
          current ? { ...current, money: Math.max(0, value) } : current,
        );
      },
      addReputation: (amount = 10) => {
        const value = finiteCheatValue(amount, 'amount');
        setGame((current) =>
          current
            ? {
                ...current,
                reputation: Math.max(0, current.reputation + value),
              }
            : current,
        );
      },
      setReputation: (amount) => {
        const value = finiteCheatValue(amount, 'amount');
        setGame((current) =>
          current ? { ...current, reputation: Math.max(0, value) } : current,
        );
      },
      help: () =>
        [
          'rasenreich.addMoney(amount = 10000)',
          'rasenreich.setMoney(amount)',
          'rasenreich.addReputation(amount = 10)',
          'rasenreich.setReputation(amount)',
        ].join('\n'),
    };

    window.rasenreich = cheats;
    if (!devCheatsAnnounced) {
      console.info('Rasenreich Dev-Cheats aktiv: rasenreich.help()');
      devCheatsAnnounced = true;
    }
    return () => {
      if (window.rasenreich === cheats) delete window.rasenreich;
    };
  }, []);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      setGame((current) => {
        if (!current) return current;
        const result = simulateGame(current, Date.now(), true);
        if (result.summary.elapsedMs >= 60_000)
          setOfflineSummary(result.summary);
        return result.state;
      });
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  // Der Updater darf keine Meldung ausloesen: React ruft ihn im Strict Mode
  // doppelt auf, der Toast erschiene dann zweimal. Die Zuweisung hier ist
  // idempotent, ausgegeben wird erst nach dem Rendern.
  const run = useCallback((operation: (current: GameState) => GameResult) => {
    setGame((current) => {
      if (!current) return current;
      const result = operation(current);
      pendingMessage.current = result.message;
      return result.state;
    });
  }, []);

  useEffect(() => {
    const message = pendingMessage.current;
    if (!message) return;
    pendingMessage.current = undefined;
    showToast(message);
  });

  return {
    game,
    toasts,
    dismissToast,
    offlineSummary,
    dismissOfflineSummary: () => setOfflineSummary(null),
    setTutorialStep: (step: number | null) =>
      setGame((current) =>
        current ? { ...current, tutorialStep: step } : current,
      ),
    startTask: (propertyId: string, kind: TaskKind) =>
      run((current) => startTask(current, propertyId, kind)),
    startAutomationIntervention: (propertyId: string) =>
      run((current) => startAutomationIntervention(current, propertyId)),
    cancelTask: (propertyId: string, kind: TaskKind) =>
      run((current) => cancelTask(current, propertyId, kind)),
    acceptOffer: (offerId: string) =>
      run((current) => acceptOffer(current, offerId)),
    declineOffer: (offerId: string) =>
      run((current) => declineOffer(current, offerId)),
    terminateContract: (propertyId: string) =>
      run((current) => terminateContract(current, propertyId)),
    unlockEquipment: (kind: TaskKind) =>
      run((current) => unlockEquipment(current, kind)),
    installEquipment: (propertyId: string, kind: TaskKind) =>
      run((current) => installEquipment(current, propertyId, kind)),
    unlockChemistry: (kind: 'fertilizer' | 'weedControl') =>
      run((current) => unlockChemistry(current, kind)),
    hireWorker: () => run((current) => hireWorker(current)),
    installChemistry: (
      propertyId: string,
      kind: 'fertilizer' | 'weedControl',
    ) => run((current) => installChemistry(current, propertyId, kind)),
    resolveEvent: () => run((current) => resolveEvent(current)),
    resetGame: () => {
      const confirmed = window.confirm(
        'Wirklich neu starten? Dein aktueller Betrieb und alle Fortschritte gehen verloren.',
      );
      if (!confirmed) return false;
      void getSaveStorage().remove(STORAGE_KEY);
      void getSaveStorage().remove(LEGACY_STORAGE_KEY);
      setGame(createInitialState());
      setOfflineSummary(null);
      setToasts([]);
      showToast('Ein neuer Betrieb wurde gestartet.', 'good');
      return true;
    },
  };
}
