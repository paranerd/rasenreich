import { RefreshCw } from 'lucide-react';
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import { Button } from '@/components/button';

interface PwaUpdateContextValue {
  updateAvailable: boolean;
  installing: boolean;
  installUpdate: () => void;
}

const PwaUpdateContext = createContext<PwaUpdateContextValue | null>(null);

export function usePwaUpdate() {
  const context = useContext(PwaUpdateContext);
  if (!context) throw new Error('PwaUpdateProvider fehlt');
  return context;
}

export function PwaUpdateProvider({ children }: { children: ReactNode }) {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(
    null,
  );
  const [promptOpen, setPromptOpen] = useState(false);
  const [installing, setInstalling] = useState(false);
  const controlledRef = useRef(false);
  const reloadingRef = useRef(false);
  const updateRequestedRef = useRef(false);

  const updateVisible = waitingWorker !== null && promptOpen;

  useEffect(() => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;

    controlledRef.current = Boolean(navigator.serviceWorker.controller);
    let disposed = false;
    let registration: ServiceWorkerRegistration | null = null;
    const observedWorkers = new WeakSet<ServiceWorker>();
    const workerCleanups: Array<() => void> = [];

    const offerUpdate = (worker: ServiceWorker) => {
      if (disposed || !navigator.serviceWorker.controller) return;
      setWaitingWorker(worker);
      setPromptOpen(true);
      setInstalling(false);
    };

    const observeWorker = (worker: ServiceWorker | null) => {
      if (!worker || observedWorkers.has(worker)) return;
      observedWorkers.add(worker);

      const handleStateChange = () => {
        if (worker.state === 'installed') offerUpdate(worker);
      };

      worker.addEventListener('statechange', handleStateChange);
      workerCleanups.push(() =>
        worker.removeEventListener('statechange', handleStateChange),
      );
      handleStateChange();
    };

    const handleControllerChange = () => {
      const wasControlled = controlledRef.current;
      controlledRef.current = true;

      // Die allererste PWA-Installation soll die offene Partie nicht neu laden.
      if (!wasControlled && !updateRequestedRef.current) return;
      if (reloadingRef.current) return;
      reloadingRef.current = true;
      window.location.reload();
    };

    const handleUpdateFound = () =>
      observeWorker(registration?.installing ?? null);

    const registerWorker = async () => {
      try {
        const registeredWorker = await navigator.serviceWorker.register(
          `${import.meta.env.BASE_URL}sw.js`,
          { scope: import.meta.env.BASE_URL },
        );
        if (disposed) return;

        registration = registeredWorker;
        registration.addEventListener('updatefound', handleUpdateFound);

        if (registration.waiting) offerUpdate(registration.waiting);
        observeWorker(registration.installing);
        void registration.update().catch(() => undefined);
      } catch {
        // Die normale Web-App bleibt auch ohne Service Worker nutzbar.
      }
    };

    const handleLoad = () => void registerWorker();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void registration?.update().catch(() => undefined);
      }
    };

    navigator.serviceWorker.addEventListener(
      'controllerchange',
      handleControllerChange,
    );
    document.addEventListener('visibilitychange', handleVisibilityChange);

    if (document.readyState === 'complete') handleLoad();
    else window.addEventListener('load', handleLoad, { once: true });

    return () => {
      disposed = true;
      window.removeEventListener('load', handleLoad);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      navigator.serviceWorker.removeEventListener(
        'controllerchange',
        handleControllerChange,
      );
      registration?.removeEventListener('updatefound', handleUpdateFound);
      workerCleanups.forEach((cleanup) => cleanup());
    };
  }, []);

  useEffect(() => {
    if (!updateVisible) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPromptOpen(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [updateVisible]);

  const installUpdate = () => {
    if (!waitingWorker) return;
    setInstalling(true);
    updateRequestedRef.current = true;
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });
  };

  return (
    <PwaUpdateContext.Provider
      value={{
        updateAvailable: waitingWorker !== null,
        installing,
        installUpdate,
      }}
    >
      {children}
      {updateVisible && (
        <div className="overlay pwa-update-overlay">
          <dialog
            open
            className="dialog pwa-update"
            aria-modal="true"
            aria-labelledby="pwa-update-title"
            aria-describedby="pwa-update-description"
          >
            <div className="pwa-update__icon" aria-hidden="true">
              <RefreshCw />
            </div>
            <div className="pwa-update__content">
              <h2 className="pwa-update__title" id="pwa-update-title">
                Update verfügbar
              </h2>
              <p className="pwa-update__text" id="pwa-update-description">
                Eine neue Version von Rasenreich ist bereit. Installiere sie
                jetzt, um die neuesten Verbesserungen zu verwenden.
              </p>
            </div>
            <div className="pwa-update__actions">
              <Button
                variant="outline"
                onClick={() => setPromptOpen(false)}
                disabled={installing}
              >
                Später
              </Button>
              <Button autoFocus onClick={installUpdate} disabled={installing}>
                <RefreshCw className={installing ? 'pulse' : undefined} />
                {installing ? 'Wird installiert …' : 'Update installieren'}
              </Button>
            </div>
          </dialog>
        </div>
      )}
    </PwaUpdateContext.Provider>
  );
}
