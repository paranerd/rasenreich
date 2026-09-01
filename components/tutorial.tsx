import { useEffect, useState, type CSSProperties } from 'react';
import { Banknote, Sparkles, Sprout, Wrench, X } from 'lucide-react';

import { Button } from '@/components/button';

export type TutorialTarget =
  | 'starter-offer'
  | 'accept-offer'
  | 'property-layout'
  | 'property-card'
  | 'property-values'
  | 'satisfaction'
  | 'mow-action'
  | 'mow-button'
  | 'activity'
  | 'money'
  | 'reputation'
  | 'property-detail';

interface TutorialCopy {
  title: string;
  text: string;
  target?: TutorialTarget;
  action?: boolean;
  final?: boolean;
}

const STEPS: TutorialCopy[] = [
  {
    title: 'Willkommen bei Rasenreich',
    text: 'Pflege Grundstücke, halte deine Kunden zufrieden und baue aus kleinen Aufträgen einen starken Gartenbetrieb auf.',
  },
  {
    title: 'Dein erstes Angebot',
    text: 'Jedes Angebot zeigt dir Fläche, mögliche Vergütung und die Eigenheiten des Grundstücks. Diese Werte bestimmen Aufwand und Ertrag.',
    target: 'starter-offer',
  },
  {
    title: 'Gewinne deinen ersten Kunden',
    text: 'Nimm das Angebot von Familie Bergmann an, um das Grundstück in deinen Betrieb aufzunehmen.',
    target: 'accept-offer',
    action: true,
  },
  {
    title: 'Dein Betrieb im Überblick',
    text: 'Links wechselst du zwischen deinen Grundstücken. Rechts siehst du Details, Zustände und alle verfügbaren Aktionen.',
    target: 'property-layout',
  },
  {
    title: 'Drei Werte, ein gesunder Garten',
    text: 'Rasenschnitt, Bewässerung und Wartung verändern sich mit der Zeit. Behalte alle drei Werte im Blick.',
    target: 'property-values',
  },
  {
    title: 'Zufriedene Kunden bleiben',
    text: 'Die Zufriedenheit fasst den Zustand des Grundstücks zusammen. Gute Pflege schützt den Vertrag und verbessert deinen Fortschritt.',
    target: 'satisfaction',
  },
  {
    title: 'Plane deine Arbeit',
    text: 'Vor jeder Aktion siehst du Dauer und erwartete Einnahmen oder Kosten. Bergmanns Rasen ist jetzt bereit für den ersten Schnitt.',
    target: 'mow-action',
  },
  {
    title: 'Starte den ersten Schnitt',
    text: 'Klicke auf „Mähen“. Der Auftrag beginnt sofort und läuft in mehreren Arbeitsphasen ab.',
    target: 'mow-button',
    action: true,
  },
  {
    title: 'Deine laufende Arbeit',
    text: 'Jeder Mitarbeiter hat einen eigenen Status im Header. Farbe und Restzeit zeigen seine aktuelle Aufgabe; ein Klick führt zum Grundstück.',
    target: 'activity',
  },
  {
    title: 'Dein Vermögen',
    text: 'Hier landen deine Einnahmen. Wartung, Forschung und neue Technik werden ebenfalls aus diesem Guthaben bezahlt.',
    target: 'money',
  },
  {
    title: 'Deine Reputation',
    text: 'Gute Arbeit erhöht deine Reputation. Neue Stufen bringen zusätzliche Anfragen und schalten bessere Technik frei.',
    target: 'reputation',
  },
  {
    title: 'Dein Betrieb läuft weiter',
    text: 'Rasen wächst, Böden trocknen und Geräte verschleißen – auch wenn du nicht hinsiehst. Kehre regelmäßig zurück und setze die richtigen Prioritäten.',
    target: 'property-detail',
    final: true,
  },
];

function visibleTarget(target: TutorialTarget) {
  const elements = document.querySelectorAll<HTMLElement>(
    `[data-tutorial="${target}"]`,
  );
  return Array.from(elements).find((element) => {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    return (
      rect.width > 0 &&
      rect.height > 0 &&
      style.display !== 'none' &&
      style.visibility !== 'hidden'
    );
  });
}

function useTargetRect(target?: TutorialTarget) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    let element: HTMLElement | undefined;
    let frame = 0;

    const measure = () => {
      element?.classList.remove('tutorial-target');
      element = target ? visibleTarget(target) : undefined;
      element?.classList.add('tutorial-target');
      setRect(element?.getBoundingClientRect() ?? null);
    };

    frame = window.requestAnimationFrame(measure);
    window.addEventListener('resize', measure);
    document.addEventListener('scroll', measure, true);
    const observer = new ResizeObserver(measure);
    observer.observe(document.documentElement);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', measure);
      document.removeEventListener('scroll', measure, true);
      observer.disconnect();
      element?.classList.remove('tutorial-target');
    };
  }, [target]);

  return rect;
}

function IntroContent() {
  return (
    <>
      <div className="tutorial-intro__visual" aria-hidden="true">
        <img
          className="tutorial-intro__image"
          src={`${import.meta.env.BASE_URL}assets/property-front-yard.jpg`}
          alt=""
        />
        <span className="tutorial-intro__shade" />
        <span className="tutorial-intro__eyebrow">
          Dein Gartenbetrieb beginnt
        </span>
      </div>
      <div className="tutorial-intro__goals" aria-label="Ziele des Spiels">
        <span>
          <Sprout aria-hidden="true" />
          <strong>Pflegen</strong>
        </span>
        <span>
          <Banknote aria-hidden="true" />
          <strong>Verdienen</strong>
        </span>
        <span>
          <Wrench aria-hidden="true" />
          <strong>Wachsen</strong>
        </span>
      </div>
    </>
  );
}

export function Tutorial({
  step,
  desktop,
  onNext,
  onSkip,
}: {
  step: number;
  desktop: boolean;
  onNext: () => void;
  onSkip: () => void;
}) {
  const [confirmExit, setConfirmExit] = useState(false);
  const base = STEPS[step] ?? STEPS[0];
  const current: TutorialCopy =
    step === 3 && !desktop
      ? {
          title: 'Öffne dein erstes Grundstück',
          text: 'Auf dem Smartphone führt dich die Grundstückskarte zur Detailansicht. Tippe jetzt auf Familie Bergmann.',
          target: 'property-card',
          action: true,
        }
      : base;
  const rect = useTargetRect(current.target);
  const intro = step === 0;
  const targetAbove = rect
    ? rect.top + rect.height / 2 < window.innerHeight / 2
    : false;
  const cardStyle: CSSProperties = intro
    ? {}
    : targetAbove
      ? { bottom: 20 }
      : { top: 20 };
  const spotlightStyle: CSSProperties | undefined = rect
    ? {
        top: Math.max(6, rect.top - 6),
        left: Math.max(6, rect.left - 6),
        width: Math.min(window.innerWidth - 12, rect.width + 12),
        height: rect.height + 12,
      }
    : undefined;

  return (
    <div
      className={`tutorial-layer ${intro ? 'tutorial-layer--intro' : ''} ${rect ? 'tutorial-layer--targeted' : ''}`}
    >
      <span className="tutorial-layer__shade" aria-hidden="true" />
      {spotlightStyle && (
        <span
          className="tutorial-spotlight"
          style={spotlightStyle}
          aria-hidden="true"
        />
      )}
      <dialog
        open
        aria-modal="true"
        aria-labelledby="tutorial-title"
        aria-describedby="tutorial-text"
        className={`tutorial-card ${intro ? 'tutorial-card--intro' : ''}`}
        style={cardStyle}
      >
        {!intro && !confirmExit && (
          <button
            type="button"
            className="tutorial-card__skip"
            onClick={() => setConfirmExit(true)}
            aria-label="Tutorial beenden"
          >
            <X aria-hidden="true" />
          </button>
        )}
        {confirmExit ? (
          <div className="tutorial-card__body tutorial-confirm">
            <h2 id="tutorial-title" className="tutorial-card__title">
              Tutorial wirklich beenden?
            </h2>
            <p id="tutorial-text" className="tutorial-card__text">
              Die Einführung wird beendet. Du kannst anschließend direkt selbst
              weiterspielen.
            </p>
            <div className="tutorial-confirm__actions">
              <Button autoFocus onClick={() => setConfirmExit(false)}>
                Im Tutorial bleiben
              </Button>
              <Button variant="outline" onClick={onSkip}>
                Tutorial beenden
              </Button>
            </div>
          </div>
        ) : (
          <>
            {intro && <IntroContent />}
            <div className="tutorial-card__body">
              {!intro && (
                <div className="tutorial-card__progress">
                  <span>
                    Schritt {step} von {STEPS.length - 1}
                  </span>
                  <span className="tutorial-card__track" aria-hidden="true">
                    <span
                      style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }}
                    />
                  </span>
                </div>
              )}
              <h2 id="tutorial-title" className="tutorial-card__title">
                {current.title}
              </h2>
              <p id="tutorial-text" className="tutorial-card__text">
                {current.text}
              </p>
              {current.action ? (
                <p className="tutorial-card__action">
                  <Sparkles aria-hidden="true" /> Führe die markierte Aktion aus
                </p>
              ) : (
                <Button
                  autoFocus
                  className="tutorial-card__next"
                  onClick={onNext}
                >
                  {current.final
                    ? 'Tutorial abschließen'
                    : intro
                      ? 'Los geht’s'
                      : 'Weiter'}
                </Button>
              )}
            </div>
          </>
        )}
      </dialog>
    </div>
  );
}
