'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  acceptOffer,
  cancelTask,
  createInitialState,
  declineOffer,
  GameResult,
  GameState,
  installChemistry,
  installEquipment,
  migrateState,
  OfflineSummary,
  resolveEvent,
  simulateGame,
  startTask,
  TaskKind,
  unlockChemistry,
  unlockEquipment,
} from '@/lib/game';
import { getSaveStorage } from '@/lib/storage';

const STORAGE_KEY = 'garden-grinder-save-v1';

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

export function useGame() {
  const [game, setGame] = useState<GameState | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const pendingMessage = useRef<string | undefined>(undefined);
  const [offlineSummary, setOfflineSummary] = useState<OfflineSummary | null>(null);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  // Die Standzeit laeuft im Toast selbst ab — hier entsteht nur der Eintrag.
  const showToast = useCallback((text?: string, tone: Toast['tone'] = 'info') => {
    if (!text) return;
    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((current) => [...current, { id, text, tone, duration: TOAST_DURATION }].slice(-MAX_TOASTS));
  }, []);

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
        const saved = await getSaveStorage().read(STORAGE_KEY);
        if (saved) {
          const migrated = migrateState(JSON.parse(saved) as GameState);
          if (migrated) {
            const result = simulateGame(migrated, Date.now(), true);
            initial = result.state;
            if (result.summary.elapsedMs >= 60_000) summary = result.summary;
          }
        }
      } catch {
        broken = true;
      }

      if (cancelled) return;
      if (broken) {
        showToast('Der alte Spielstand war nicht lesbar. Ein neuer Betrieb wurde gestartet.', 'warning');
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
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      setGame((current) => {
        if (!current) return current;
        const result = simulateGame(current, Date.now(), true);
        if (result.summary.elapsedMs >= 60_000) setOfflineSummary(result.summary);
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
    startTask: (propertyId: string, kind: TaskKind) =>
      run((current) => startTask(current, propertyId, kind)),
    cancelTask: (propertyId: string) => run((current) => cancelTask(current, propertyId)),
    acceptOffer: (offerId: string) => run((current) => acceptOffer(current, offerId)),
    declineOffer: (offerId: string) => run((current) => declineOffer(current, offerId)),
    unlockEquipment: (kind: TaskKind) => run((current) => unlockEquipment(current, kind)),
    installEquipment: (propertyId: string, kind: TaskKind) =>
      run((current) => installEquipment(current, propertyId, kind)),
    unlockChemistry: (kind: 'fertilizer' | 'weedControl') =>
      run((current) => unlockChemistry(current, kind)),
    installChemistry: (propertyId: string, kind: 'fertilizer' | 'weedControl') =>
      run((current) => installChemistry(current, propertyId, kind)),
    resolveEvent: () => run((current) => resolveEvent(current)),
    resetGame: () => {
      const confirmed = window.confirm(
        'Wirklich neu starten? Dein aktueller Betrieb und alle Fortschritte gehen verloren.',
      );
      if (!confirmed) return;
      void getSaveStorage().remove(STORAGE_KEY);
      setGame(createInitialState());
      setOfflineSummary(null);
      setToasts([]);
      showToast('Ein neuer Betrieb wurde gestartet.', 'good');
    },
  };
}
