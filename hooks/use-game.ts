'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  acceptOffer,
  createInitialState,
  declineOffer,
  GameResult,
  GameState,
  installChemistry,
  installEquipment,
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

export function useGame() {
  const [game, setGame] = useState<GameState | null>(null);
  const [notice, setNotice] = useState('');
  const [offlineSummary, setOfflineSummary] = useState<OfflineSummary | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showNotice = useCallback((message?: string) => {
    if (!message) return;
    setNotice(message);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(''), 3_500);
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
          const parsed = JSON.parse(saved) as GameState;
          if (parsed.version === 1) {
            const result = simulateGame(parsed, Date.now(), true);
            initial = result.state;
            if (result.summary.elapsedMs >= 60_000) summary = result.summary;
          }
        }
      } catch {
        broken = true;
      }

      if (cancelled) return;
      if (broken) {
        showNotice('Der alte Spielstand war nicht lesbar. Ein neuer Betrieb wurde gestartet.');
      }
      if (summary) setOfflineSummary(summary);
      setGame(initial);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [showNotice]);

  useEffect(() => {
    if (!game) return;
    void getSaveStorage().write(STORAGE_KEY, JSON.stringify(game));
  }, [game]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setGame((current) => (current ? simulateGame(current).state : current));
    }, 1_000);
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

  useEffect(
    () => () => {
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    },
    [],
  );

  const run = useCallback(
    (operation: (current: GameState) => GameResult) => {
      setGame((current) => {
        if (!current) return current;
        const result = operation(current);
        showNotice(result.message);
        return result.state;
      });
    },
    [showNotice],
  );

  return {
    game,
    notice,
    offlineSummary,
    dismissOfflineSummary: () => setOfflineSummary(null),
    startTask: (propertyId: string, kind: TaskKind) =>
      run((current) => startTask(current, propertyId, kind)),
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
      showNotice('Ein neuer Betrieb wurde gestartet.');
    },
  };
}
