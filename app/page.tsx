'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Banknote,
  BellRing,
  BookOpen,
  BriefcaseBusiness,
  Check,
  CircleAlert,
  CloudRain,
  CloudSun,
  Droplet,
  FlaskConical,
  LayoutDashboard,
  LockKeyhole,
  RotateCcw,
  Settings2,
  ShoppingBag,
  Sparkles,
  Sprout,
  Sun,
  UserPlus,
  Users,
  Wrench,
  X,
} from 'lucide-react';

import { Button } from '@/components/button';
import { Gauge, metricToneColor } from '@/components/gauge';
import { Tutorial } from '@/components/tutorial';
import { Toast, useGame } from '@/hooks/use-game';
import {
  ACTION_LABELS,
  availableWorkerId,
  EQUIPMENT,
  EquipmentLevel,
  formatDuration,
  formatMoney,
  GameEvent,
  GardenProperty,
  GameState,
  humanOfflineDuration,
  isBroken,
  maintenanceCost,
  mowingPayout,
  mowingPayoutShare,
  propertyMetricPercent,
  PropertyTask,
  propertyStatus,
  researchDurationMs,
  TASK_LABELS,
  taskPhase,
  taskTotalDuration,
  TaskKind,
  ViewName,
  wateringPayout,
  WorkerAssignment,
  workerAssignments,
  WORKER_UPGRADES,
} from '@/lib/game';

const KINDS: TaskKind[] = ['mow', 'water', 'maintain'];

const PROPERTY_ILLUSTRATIONS: Record<string, string> = {
  Vorgarten: 'property-front-yard.jpg',
  Wohnhaus: 'property-house.jpg',
  Stadtvilla: 'property-city-villa.jpg',
  Firmengelände: 'property-business.jpg',
  Landgut: 'property-country-estate.jpg',
  Parkanlage: 'property-park.jpg',
};

function propertyIllustration(type: string) {
  return PROPERTY_ILLUSTRATIONS[type] ?? PROPERTY_ILLUSTRATIONS.Vorgarten;
}

function useDesktopLayout() {
  const [desktop, setDesktop] = useState(
    () => window.matchMedia('(min-width: 64rem)').matches,
  );

  useEffect(() => {
    const query = window.matchMedia('(min-width: 64rem)');
    const update = () => setDesktop(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  return desktop;
}

/** Reine Zahl ohne Währung — der Kopf setzt das Eurozeichen eigenständig daneben. */
const amountFormatter = new Intl.NumberFormat('de-DE', {
  maximumFractionDigits: 0,
});

function satisfactionColor(value: number) {
  if (value >= 75) return 'var(--tone-ok)';
  if (value >= 40) return 'var(--tone-warn)';
  return 'var(--tone-bad)';
}

/** Aufgehellte Varianten für Text auf der abgedunkelten Illustration. */
function satisfactionColorOnImage(value: number) {
  if (value >= 75) return '#b7d99a';
  if (value >= 40) return '#e8c684';
  return '#eda694';
}

/**
 * Welche Aufgabe der Betrieb als Nächstes braucht — steuert die hervorgehobene
 * Schaltfläche. Ohne dringenden Bedarf bleibt keine Aktion hervorgehoben.
 */
function recommendedTask(property: GardenProperty): TaskKind | undefined {
  if (isBroken(property)) return 'maintain';
  if (property.condition < 35) return 'maintain';
  if (property.moisture < 50) return 'water';
  if (property.grass >= 60) return 'mow';
  return undefined;
}

/** Kurztext für die mobile Übersicht: nennt den wichtigsten nächsten Schritt ohne Kennzahl. */
function urgentTaskHint(property: GardenProperty) {
  if (property.rescueUntil)
    return 'Hier ist jetzt deine volle Aufmerksamkeit gefragt';
  if (property.tasks.length > 1) return 'Hier laufen mehrere Arbeiten parallel';
  const running = property.tasks[0];
  if (running) {
    if (running.kind === 'mow')
      return 'Der Rasen bekommt gerade seinen Schnitt';
    if (running.kind === 'water') return 'Hier läuft gerade das Wasser';
    return 'Das Werkzeug wird wieder fit gemacht';
  }
  if (isBroken(property)) return 'Das Werkzeug braucht etwas Zuwendung';

  const recommended = recommendedTask(property);
  if (recommended === 'maintain') return 'Zeit für einen kleinen Technik-Check';
  if (recommended === 'water')
    return 'Ein Schluck Wasser wäre jetzt genau richtig';
  if (recommended === 'mow') return 'Der Rasen könnte einen Schnitt vertragen';
  return 'Hier ist gerade alles im grünen Bereich';
}

/** Was der Betrieb gerade tut — Vorbereiten, die Arbeit selbst, Abschließen. */
function taskPhaseLabel(task: PropertyTask) {
  const phase = taskPhase(task);
  if (phase === 'setup') return 'Vorbereiten';
  if (phase === 'wrapup') return 'Abschluss';
  return ACTION_LABELS[task.kind];
}

/**
 * Was der Schnitt einbringt, gemessen am bestmöglichen Ertrag. Während des
 * Mähens zählt der Rasen vom Start — der Lohn wurde dort eingefroren, obwohl
 * der Wert sichtbar mitläuft.
 */
function payoutHint(property: GardenProperty) {
  const running = property.tasks.find((task) => task.kind === 'mow');
  const grass = running?.startGrass ?? property.grass;
  const value = mowingPayoutShare(property, grass);
  const share = `${value} %`;
  if (grass > 100) return `${share} · überwachsen`;
  if (value >= 100) return `${share} · voller Schnitt`;
  if (value >= 55) return `${share} · lohnt sich`;
  return `${share} · kaum gewachsen`;
}

type FilterId = 'all' | 'cared' | 'due' | 'blocked' | 'critical';

const FILTERS: Array<{
  id: FilterId;
  label: string;
  tone: 'all' | 'good' | 'warning' | 'danger';
  match: (property: GardenProperty) => boolean;
}> = [
  { id: 'all', label: 'Alle', tone: 'all', match: () => true },
  {
    id: 'cared',
    label: 'Gepflegt',
    tone: 'good',
    match: (property) => propertyStatus(property).label === 'Gepflegt',
  },
  {
    id: 'due',
    label: 'Fällig',
    tone: 'warning',
    match: (property) => propertyStatus(property).label === 'Fällig',
  },
  {
    id: 'blocked',
    label: 'Blockiert',
    tone: 'danger',
    match: (property) => propertyStatus(property).label === 'Blockiert',
  },
  {
    id: 'critical',
    label: 'Kritisch',
    tone: 'danger',
    match: (property) => propertyStatus(property).label === 'Kritisch',
  },
];

/** Auffällige Zustände, die im Grundstücks-Scroller ein Symbol verdienen. */
function propertyFlags(property: GardenProperty) {
  const flags: Array<{
    id: string;
    Icon: typeof Wrench;
    tone: string;
    label: string;
  }> = [];
  if (property.rescueUntil) {
    flags.push({
      id: 'rescue',
      Icon: CircleAlert,
      tone: 'danger',
      label: 'Vertrag gefährdet',
    });
  }
  if (isBroken(property)) {
    flags.push({
      id: 'broken',
      Icon: Wrench,
      tone: 'danger',
      label: 'Gerät ausgefallen',
    });
  } else if (property.condition < 45) {
    flags.push({
      id: 'wear',
      Icon: Wrench,
      tone: 'warning',
      label: 'Wartung fällig',
    });
  }
  return flags;
}

function StatusChip({ property }: { property: GardenProperty }) {
  const status = propertyStatus(property);
  return <span className={`chip tone--${status.tone}`}>{status.label}</span>;
}

function StatusDot({ property }: { property: GardenProperty }) {
  const status = propertyStatus(property);
  return (
    <span
      className={`dot tone--${status.tone} ${property.tasks.length > 0 ? 'pulse' : ''}`}
      aria-hidden="true"
    />
  );
}

function weatherLabel(weather: 'mild' | 'heat' | 'rain') {
  return weather === 'heat'
    ? 'Hitzewelle'
    : weather === 'rain'
      ? 'Regenschauer'
      : 'Mildes Wetter';
}

function WeatherBadge({
  weather,
  className,
  onClick,
}: {
  weather: 'mild' | 'heat' | 'rain';
  className?: string;
  onClick: () => void;
}) {
  const label = weatherLabel(weather);
  const Icon =
    weather === 'rain' ? CloudRain : weather === 'heat' ? Sun : CloudSun;
  const color =
    weather === 'heat'
      ? 'var(--tone-warn)'
      : weather === 'rain'
        ? 'var(--kind-water)'
        : 'var(--ink-mute)';
  return (
    <button
      type="button"
      className={`weather ${className ?? ''}`}
      title={`${label} – Details anzeigen`}
      aria-label={`${label} – Details anzeigen`}
      onClick={onClick}
    >
      <Icon style={{ color }} aria-hidden="true" />
    </button>
  );
}

/** Reputation als anteilig gefüllter Ring — eigene Farbe, damit sie kein Grundstückswert ist. */
function ReputationRingGraphic({ reputation }: { reputation: number }) {
  const level = Math.floor(reputation);
  const percent = Math.min(100, Math.max(0, (reputation - level) * 100));
  const circumference = 2 * Math.PI * 12;

  return (
    <>
      <svg
        className="rep__svg"
        width="30"
        height="30"
        viewBox="0 0 30 30"
        aria-hidden="true"
      >
        <circle
          cx="15"
          cy="15"
          r="12"
          fill="none"
          stroke="var(--track)"
          strokeWidth="3.5"
        />
        <circle
          cx="15"
          cy="15"
          r="12"
          fill="none"
          stroke="var(--rep)"
          strokeWidth="3.5"
          strokeLinecap="butt"
          strokeDasharray={`${(circumference * percent) / 100} ${circumference}`}
        />
      </svg>
      <span className="rep__value">{level.toLocaleString('de-DE')}</span>
    </>
  );
}

function ReputationRing({
  reputation,
  onClick,
}: {
  reputation: number;
  onClick: () => void;
}) {
  const level = Math.floor(reputation);
  const next = level + 1;
  const displayedReputation = level.toLocaleString('de-DE');
  const previousLevel = useRef(level);
  const [levelUpPulse, setLevelUpPulse] = useState(false);

  useEffect(() => {
    if (level > previousLevel.current) setLevelUpPulse(true);
    previousLevel.current = level;
  }, [level]);

  return (
    <button
      type="button"
      className={`rep ${levelUpPulse ? 'rep--level-up' : ''}`}
      data-tutorial="reputation"
      title={`Reputation ${displayedReputation} — Details anzeigen`}
      aria-label={`Reputation ${displayedReputation}, Fortschritt zu Stufe ${next} – Details anzeigen`}
      onClick={onClick}
      onAnimationEnd={() => setLevelUpPulse(false)}
    >
      <ReputationRingGraphic reputation={reputation} />
    </button>
  );
}

function availableUpgradeCount(game: GameState) {
  const workerUpgrade = WORKER_UPGRADES.find(
    (entry) => entry.workers === game.workers + 1,
  );
  const workerCount =
    workerUpgrade &&
    game.reputation >= workerUpgrade.reputation &&
    game.money >= workerUpgrade.cost
      ? 1
      : 0;
  if (game.researchTask) return workerCount;
  const equipmentCount = KINDS.filter((kind) => {
    const nextUnlock = EQUIPMENT[kind][game.unlocked[kind] + 1];
    return (
      nextUnlock &&
      game.reputation >= nextUnlock.reputation &&
      game.money >= nextUnlock.unlockCost
    );
  }).length;
  const careCount = [
    { id: 'fertilizer' as const, reputation: 8, cost: 700 },
    { id: 'weedControl' as const, reputation: 15, cost: 1_200 },
  ].filter(
    (item) =>
      !game.chemistryUnlocked[item.id] &&
      (item.id === 'fertilizer' || game.chemistryUnlocked.fertilizer) &&
      game.reputation >= item.reputation &&
      game.money >= item.cost,
  ).length;
  return workerCount + equipmentCount + careCount;
}

/** Ein kompakter Status pro Mitarbeiter — ohne Bezeichnung, nur Punkt und Zeit. */
function WorkerStatuses({
  assignments,
  now,
  onOpen,
}: {
  assignments: WorkerAssignment[];
  now: number;
  onOpen: (assignment: WorkerAssignment) => void;
}) {
  return (
    <div className="workers" data-tutorial="activity" aria-label="Mitarbeiter">
      {assignments.map((assignment) => {
        const task = assignment.task;
        const research = assignment.researchTask;
        const active = Boolean(task || research);
        const end = task?.endsAt ?? research?.endsAt;
        const tone = task?.kind ?? (research ? 'research' : 'idle');
        const title = research
          ? `Mitarbeiter ${assignment.workerId + 1}: ${research.name} wird gelernt`
          : task
            ? `Mitarbeiter ${assignment.workerId + 1}: ${taskPhaseLabel(task)} bei ${assignment.propertyName}`
            : `Mitarbeiter ${assignment.workerId + 1}: frei`;
        return (
          <button
            key={assignment.workerId}
            type="button"
            className={`worker-status worker-status--${tone}`}
            disabled={!active}
            onClick={() => onOpen(assignment)}
            title={title}
            aria-label={title}
          >
            <span
              className={`worker-status__dot ${active ? 'pulse' : ''}`}
              aria-hidden="true"
            />
            <span className="worker-status__time">
              {end ? formatDuration(end - now) : 'Frei'}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function AppHeader({
  money,
  reputation,
  weather,
  assignments,
  now,
  onAssignment,
  onReputation,
  onWeather,
  onHome,
}: {
  money: number;
  reputation: number;
  weather: 'mild' | 'heat' | 'rain';
  assignments: WorkerAssignment[];
  now: number;
  onAssignment: (assignment: WorkerAssignment) => void;
  onReputation: () => void;
  onWeather: () => void;
  onHome: () => void;
}) {
  return (
    <header className="header">
      {/* Drei Spalten, damit das Vermögen unabhängig von den Seiten mittig steht */}
      <div className="header__inner">
        <div className="header__left">
          <WeatherBadge weather={weather} onClick={onWeather} />
          <button type="button" className="header__brand" onClick={onHome}>
            <span className="header__wordmark">RASENREICH</span>
          </button>
        </div>

        <div className="header__money">
          <span className="header__money-label">Vermögen</span>
          <span className="header__money-value" data-tutorial="money">
            {formatMoney(money)}
          </span>
          <WorkerStatuses
            assignments={assignments}
            now={now}
            onOpen={onAssignment}
          />
        </div>

        <div className="header__right">
          <ReputationRing reputation={reputation} onClick={onReputation} />
        </div>
      </div>
    </header>
  );
}

/** Schmale Icon-Leiste links: Hauptnavigation und Einstellungen auf Desktop. */
function SideNav({
  view,
  setView,
  settingsOpen,
  onSettings,
  offerCount,
  upgradeCount,
}: {
  view: ViewName;
  setView: (view: ViewName) => void;
  settingsOpen: boolean;
  onSettings: () => void;
  offerCount: number;
  upgradeCount: number;
}) {
  const nav = [
    { id: 'overview' as const, label: 'Betrieb', icon: LayoutDashboard },
    { id: 'offers' as const, label: 'Angebote', icon: BriefcaseBusiness },
    { id: 'upgrades' as const, label: 'Upgrades', icon: ShoppingBag },
  ];

  return (
    <nav className="sidenav" aria-label="Hauptnavigation">
      {nav.map(({ id, label, icon: Icon }) => {
        const active = !settingsOpen && view === id;
        const indicator =
          id === 'offers' ? offerCount : id === 'upgrades' ? upgradeCount : 0;
        return (
          <button
            key={id}
            type="button"
            className={`sidenav__item ${active ? 'sidenav__item--active' : ''}`}
            onClick={() => setView(id)}
            aria-current={active ? 'page' : undefined}
          >
            <span className="nav-icon">
              <Icon aria-hidden="true" />
              {indicator > 0 && (
                <span
                  className="nav-indicator"
                  aria-label={
                    id === 'offers'
                      ? `${indicator} ${indicator === 1 ? 'neuer Auftrag' : 'neue Aufträge'}`
                      : `${indicator} ${
                          indicator === 1
                            ? 'freischaltbares Upgrade'
                            : 'freischaltbare Upgrades'
                        }`
                  }
                >
                  {indicator > 9 ? '9+' : indicator}
                </span>
              )}
            </span>
            <span className="sidenav__label">{label}</span>
          </button>
        );
      })}

      <button
        type="button"
        className={`sidenav__item sidenav__settings ${settingsOpen ? 'sidenav__item--active' : ''}`}
        onClick={onSettings}
        aria-current={settingsOpen ? 'page' : undefined}
      >
        <Settings2 aria-hidden="true" />
        <span className="sidenav__label">Einstellungen</span>
      </button>
    </nav>
  );
}

/** Mobiler Kopf: Vermögen als größte Zahl, darunter Aktivität, daneben der Ruf. */
function MobileHeader({
  money,
  reputation,
  weather,
  assignments,
  now,
  onAssignment,
  onReputation,
  onWeather,
}: {
  money: number;
  reputation: number;
  weather: 'mild' | 'heat' | 'rain';
  assignments: WorkerAssignment[];
  now: number;
  onAssignment: (assignment: WorkerAssignment) => void;
  onReputation: () => void;
  onWeather: () => void;
}) {
  return (
    <header className="mobile-header">
      <WeatherBadge
        weather={weather}
        className="mobile-header__weather"
        onClick={onWeather}
      />

      <span className="mobile-header__label">Vermögen</span>
      <span className="mobile-header__money" data-tutorial="money">
        <span className="mobile-header__amount">
          {amountFormatter.format(money)}
        </span>
        <span className="mobile-header__currency">€</span>
      </span>

      <WorkerStatuses
        assignments={assignments}
        now={now}
        onOpen={onAssignment}
      />

      <span className="mobile-header__rep">
        <ReputationRing reputation={reputation} onClick={onReputation} />
      </span>
    </header>
  );
}

function HeaderInfoDialog({
  kind,
  game,
  onClose,
}: {
  kind: 'reputation' | 'weather';
  game: GameState;
  onClose: () => void;
}) {
  const reputationLevel = Math.floor(game.reputation);
  const WeatherIcon =
    game.weather === 'rain'
      ? CloudRain
      : game.weather === 'heat'
        ? Sun
        : CloudSun;
  const weatherText =
    game.weather === 'rain'
      ? 'Regen bewässert alle Grundstücke gleichzeitig.'
      : game.weather === 'heat'
        ? 'Die Böden trocknen während der Hitzewelle schneller aus. Kontrolliere die Bewässerung häufiger.'
        : 'Rasenwachstum und Austrocknung laufen unter normalen Bedingungen.';

  return (
    <div className="overlay header-info-overlay">
      <button
        type="button"
        className="overlay__backdrop"
        onClick={onClose}
        aria-label="Infofenster schließen"
      />
      <dialog
        open
        aria-modal="true"
        aria-labelledby="header-info-title"
        className="dialog header-info"
      >
        <button
          type="button"
          className="header-info__close"
          onClick={onClose}
          aria-label="Schließen"
        >
          <X aria-hidden="true" />
        </button>
        {kind === 'reputation' ? (
          <>
            <span
              className="rep header-info__reputation-ring"
              aria-label={`Reputation ${reputationLevel.toLocaleString('de-DE')}`}
            >
              <ReputationRingGraphic reputation={game.reputation} />
            </span>
            <h2 id="header-info-title" className="header-info__title">
              Reputation
            </h2>
            <p className="header-info__lead">
              Gute Arbeit steigert deinen Ruf. Höhere Stufen bringen neue
              Angebote und schalten besseres Wissen frei.
            </p>
          </>
        ) : (
          <>
            <span
              className={`header-info__icon header-info__icon--${game.weather}`}
              aria-hidden="true"
            >
              <WeatherIcon />
            </span>
            <h2 id="header-info-title" className="header-info__title">
              {weatherLabel(game.weather)}
            </h2>
            <p className="header-info__lead">{weatherText}</p>
          </>
        )}
        <Button className="header-info__button" onClick={onClose}>
          Okay
        </Button>
      </dialog>
    </div>
  );
}

function MobileTabBar({
  view,
  setView,
  settingsOpen,
  onSettings,
  offerCount,
  upgradeCount,
}: {
  view: ViewName;
  setView: (view: ViewName) => void;
  settingsOpen: boolean;
  onSettings: () => void;
  offerCount: number;
  upgradeCount: number;
}) {
  const tabs = [
    { id: 'overview' as const, label: 'Grundstücke', icon: LayoutDashboard },
    { id: 'offers' as const, label: 'Aufträge', icon: BriefcaseBusiness },
    { id: 'upgrades' as const, label: 'Upgrades', icon: ShoppingBag },
    { id: 'settings' as const, label: 'Einstellungen', icon: Settings2 },
  ];

  return (
    <nav className="tabbar" aria-label="Hauptnavigation">
      {tabs.map(({ id, label, icon: Icon }) => {
        const active =
          id === 'settings' ? settingsOpen : !settingsOpen && view === id;
        const indicator =
          id === 'offers' ? offerCount : id === 'upgrades' ? upgradeCount : 0;
        return (
          <button
            key={id}
            type="button"
            className={`tabbar__item ${active ? 'tabbar__item--active' : ''}`}
            onClick={() => (id === 'settings' ? onSettings() : setView(id))}
            aria-current={active ? 'page' : undefined}
          >
            <span className="nav-icon">
              <Icon aria-hidden="true" />
              {indicator > 0 && (
                <span
                  className="nav-indicator"
                  aria-label={
                    id === 'offers'
                      ? `${indicator} ${indicator === 1 ? 'neuer Auftrag' : 'neue Aufträge'}`
                      : `${indicator} ${
                          indicator === 1
                            ? 'freischaltbares Upgrade'
                            : 'freischaltbare Upgrades'
                        }`
                  }
                >
                  {indicator > 9 ? '9+' : indicator}
                </span>
              )}
            </span>
            <span className="tabbar__label">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}

const TOAST_ICON = { good: Check, warning: BellRing, info: Sparkles } as const;

type ToastTone = keyof typeof TOAST_ICON;

/**
 * Eine Meldung im Stapel. Ohne Standzeit bleibt sie stehen und will bestätigt
 * werden; mit Standzeit läuft der Balken am unteren Rand sichtbar ab.
 */
function ToastCard({
  text,
  tone,
  duration,
  actionLabel,
  onDismiss,
}: {
  text: React.ReactNode;
  tone: ToastTone;
  duration?: number;
  actionLabel?: string;
  onDismiss: () => void;
}) {
  const Icon = TOAST_ICON[tone];
  // Der Spieltakt rendert jede Sekunde neu. Ohne Ref auf die Rückmeldung
  // würde der Effekt jedes Mal neu laufen und die Standzeit nie ablaufen.
  const dismissRef = useRef(onDismiss);

  useEffect(() => {
    dismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    if (!duration) return;
    const timer = window.setTimeout(() => dismissRef.current(), duration);
    return () => window.clearTimeout(timer);
  }, [duration]);

  return (
    <div className={`toast toast--${tone}`}>
      <div className="toast__body">
        <Icon className="toast__icon" aria-hidden="true" />
        <p className="toast__text">{text}</p>
        {actionLabel ? (
          <Button variant="outline" size="xs" onClick={onDismiss}>
            {actionLabel}
          </Button>
        ) : (
          <button
            type="button"
            className="toast__close"
            aria-label="Meldung schließen"
            onClick={onDismiss}
          >
            <X aria-hidden="true" />
          </button>
        )}
      </div>
      {duration ? (
        <span className="toast__track" aria-hidden="true">
          <span
            className="toast__timer"
            style={{ animationDuration: `${duration}ms` }}
          />
        </span>
      ) : null}
    </div>
  );
}

/** Alle Meldungen an einer Stelle: zentriert oben, direkt unter dem Kopf. */
function ToastStack({
  event,
  toasts,
  onResolveEvent,
  onDismiss,
}: {
  event?: GameEvent;
  toasts: Toast[];
  onResolveEvent: () => void;
  onDismiss: (id: string) => void;
}) {
  return (
    <div className="toasts" aria-live="polite">
      {event && (
        <ToastCard
          key={event.id}
          tone={event.type === 'review' ? 'good' : 'warning'}
          actionLabel={event.actionLabel ?? 'Verstanden'}
          onDismiss={onResolveEvent}
          text={
            <>
              <strong>{event.title}:</strong> {event.description}
            </>
          }
        />
      )}
      {toasts.map((toast) => (
        <ToastCard
          key={toast.id}
          text={toast.text}
          tone={toast.tone}
          duration={toast.duration}
          onDismiss={() => onDismiss(toast.id)}
        />
      ))}
    </div>
  );
}

function FilterChips({
  properties,
  active,
  onChange,
  className = '',
}: {
  properties: GardenProperty[];
  active: FilterId | null;
  onChange: (id: FilterId | null) => void;
  className?: string;
}) {
  // Die Leiste bleibt vollständig stehen, damit die Schaltflächen nicht springen.
  const chips = FILTERS.map((filter) => ({
    ...filter,
    count: properties.filter(filter.match).length,
  }));

  return (
    <div className={`filters ${className}`}>
      {chips.map((chip) => {
        const on = chip.id === active;
        const empty = chip.count === 0;
        return (
          <button
            key={chip.id}
            type="button"
            className={`filter tone--${chip.tone} ${on ? 'filter--on' : ''} ${empty ? 'filter--empty' : ''}`}
            disabled={empty && !on}
            onClick={() => onChange(on ? null : chip.id)}
            aria-pressed={on}
          >
            {chip.label}
          </button>
        );
      })}
    </div>
  );
}

/** Dichte Liste links auf Desktop. */
function PropertyList({
  properties,
  selectedId,
  filter,
  onFilter,
  onSelect,
}: {
  properties: GardenProperty[];
  selectedId: string;
  filter: FilterId | null;
  onFilter: (id: FilterId | null) => void;
  onSelect: (id: string) => void;
}) {
  const blocked = properties.filter(
    (property) => propertyStatus(property).label === 'Blockiert',
  ).length;
  const match =
    FILTERS.find((entry) => entry.id === filter)?.match ?? (() => true);
  const visible = properties.filter(match);

  return (
    <aside className="plist">
      <div className="plist__head">
        <span className="plist__count">
          {filter === null || filter === 'all'
            ? `${properties.length} ${properties.length === 1 ? 'Grundstück' : 'Grundstücke'}`
            : `${visible.length} von ${properties.length}`}
        </span>
        {blocked > 0 && (
          <span className="plist__blocked">{blocked} blockiert</span>
        )}
      </div>
      <FilterChips
        properties={properties}
        active={filter}
        onChange={onFilter}
        className="filters--divided"
      />
      <div className="plist__scroll">
        {visible.length === 0 && (
          <p className="plist__empty">
            Kein Grundstück passt zu diesem Filter.
          </p>
        )}
        {visible.map((property) => {
          const selected = property.id === selectedId;
          return (
            <button
              key={property.id}
              type="button"
              className={`plist__row ${selected ? 'plist__row--selected' : ''}`}
              onClick={() => onSelect(property.id)}
              aria-current={selected ? 'true' : undefined}
            >
              <StatusDot property={property} />
              <span className="plist__body">
                <span className="plist__name">{property.name}</span>
                <span className="plist__meta">
                  {property.size.toLocaleString('de-DE')} m² · {property.type}
                </span>
              </span>
              <span className="plist__gauges" aria-hidden="true">
                {KINDS.map((kind) => (
                  <Gauge
                    key={kind}
                    kind={kind}
                    value={propertyMetricPercent(property, kind)}
                    variant="mini"
                  />
                ))}
              </span>
              <span
                className="plist__score"
                style={{ color: satisfactionColor(property.satisfaction) }}
              >
                {Math.round(property.satisfaction)} %
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

/** Waagerechte Leiste über der mobilen Detailansicht. */
function PropertyRail({
  properties,
  selectedId,
  onSelect,
}: {
  properties: GardenProperty[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="rail">
      {properties.map((property) => {
        const selected = property.id === selectedId;
        return (
          <button
            key={property.id}
            type="button"
            className={`rail__item ${selected ? 'rail__item--selected' : ''}`}
            onClick={() => onSelect(property.id)}
            aria-current={selected ? 'true' : undefined}
          >
            <span className="rail__head">
              <StatusDot property={property} />
              <span className="rail__name">{property.name}</span>
              <span className="rail__flags">
                {propertyFlags(property).map(({ id, Icon, tone, label }) => (
                  <Icon
                    key={id}
                    className={`rail__flag tone--${tone}`}
                    aria-label={label}
                  >
                    <title>{label}</title>
                  </Icon>
                ))}
                <span
                  className="rail__score"
                  style={{ color: satisfactionColor(property.satisfaction) }}
                >
                  {Math.round(property.satisfaction)} %
                </span>
              </span>
            </span>
            <span className="rail__dots" aria-hidden="true">
              {KINDS.map((kind) => (
                <span
                  key={kind}
                  className="rail__dot"
                  style={{
                    background: metricToneColor(
                      kind,
                      propertyMetricPercent(property, kind),
                    ),
                  }}
                />
              ))}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Kopfkachel der Detailseite — die Illustration trägt sie als Hintergrund. */
function DetailHeader({ property }: { property: GardenProperty }) {
  return (
    <div className="detail-head">
      <img
        className="detail-head__image"
        src={`${import.meta.env.BASE_URL}assets/${propertyIllustration(property.type)}`}
        alt=""
        aria-hidden="true"
      />
      <div className="detail-head__scrim" aria-hidden="true" />
      <div className="detail-head__inner">
        <div className="detail-head__row">
          <div className="detail-head__titles">
            <span className="detail-head__eyebrow">{property.subtitle}</span>
            <h2 className="detail-head__name">{property.name}</h2>
            <div className="detail-head__tags">
              <StatusChip property={property} />
              <span className="detail-head__facts">
                {property.size.toLocaleString('de-DE')} m² · {property.type}
                <span className="only-wide">
                  {' '}
                  · {property.completedJobs}{' '}
                  {property.completedJobs === 1 ? 'Schnitt' : 'Schnitte'} ·{' '}
                  {formatMoney(property.lifetimeRevenue)} Umsatz
                </span>
              </span>
            </div>
          </div>
          <div className="detail-head__score" data-tutorial="satisfaction">
            <span className="detail-head__score-label">
              <span className="only-narrow">Zufrieden</span>
              <span className="only-wide">Zufriedenheit</span>
            </span>
            <span
              className="detail-head__score-value"
              style={{ color: satisfactionColorOnImage(property.satisfaction) }}
            >
              {Math.round(property.satisfaction)} %
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({
  children,
  trailing,
}: {
  children: React.ReactNode;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="section-label">
      <span className="section-label__text">{children}</span>
      {trailing && <span className="section-label__trailing">{trailing}</span>}
    </div>
  );
}

function ActionButtons({
  property,
  workerAvailable,
  now,
  onStart,
  onCancel,
  compact = false,
}: {
  property: GardenProperty;
  workerAvailable: boolean;
  now: number;
  onStart: (kind: TaskKind) => void;
  onCancel: (kind: TaskKind) => void;
  compact?: boolean;
}) {
  const recommended = recommendedTask(property);

  return (
    <div className="actions">
      {KINDS.map((kind) => {
        const equipment = EQUIPMENT[kind][property.equipment[kind]];
        const usesWorker = !equipment.automated && !equipment.handsFree;
        const running = property.tasks.find((task) => task.kind === kind);
        const progress = running
          ? Math.min(
              100,
              Math.max(
                0,
                ((now - running.startedAt) /
                  (running.endsAt - running.startedAt)) *
                  100,
              ),
            )
          : 0;
        const broken = isBroken(property, kind);
        // Bis zum Abschluss bleibt die laufende Aufgabe bedienbar — ein Klick
        // bricht sie ab. Der Abschluss selbst läuft in jedem Fall zu Ende.
        const cancellable = running
          ? taskPhase(running, now) !== 'wrapup'
          : false;
        const disabled =
          Boolean(running && !cancellable) ||
          (!running && ((usesWorker && !workerAvailable) || broken));
        // Die laufende Aktion traegt ihre eigene Darstellung, nicht die der Empfehlung.
        const on = kind === recommended && !disabled && !running;
        const duration = formatDuration(
          taskTotalDuration(property, kind) * 1_000,
        );
        const meta =
          kind === 'mow'
            ? `+${formatMoney(mowingPayout(property))} · ${duration}`
            : kind === 'water'
              ? `+${formatMoney(wateringPayout(property))} · ${duration}`
              : `−${formatMoney(maintenanceCost(property))} · ${duration}`;

        return (
          <button
            key={kind}
            type="button"
            data-tutorial={kind === 'mow' ? 'mow-button' : undefined}
            className={`action action--${kind} ${compact ? 'action--compact' : ''} ${on ? 'action--on' : ''} ${
              running ? 'action--running' : ''
            } ${cancellable ? 'action--cancellable' : ''} ${broken ? 'action--broken' : ''}`}
            disabled={disabled}
            title={cancellable ? `${ACTION_LABELS[kind]} abbrechen` : undefined}
            onClick={() => (cancellable ? onCancel(kind) : onStart(kind))}
          >
            {running && (
              // Zählt rückwärts: die gefüllte Fläche ist die verbleibende Arbeit.
              <span
                className="action__progress"
                style={{ width: `${100 - progress}%` }}
                aria-hidden="true"
              />
            )}
            <span className="action__label">
              {running ? (
                <>
                  {cancellable && (
                    <X className="action__cancel" aria-hidden="true" />
                  )}
                  {formatDuration(running.endsAt - now)}
                </>
              ) : compact && broken ? (
                'Defekt'
              ) : (
                ACTION_LABELS[kind]
              )}
            </span>
            {!compact && !running && (
              <span className="action__meta">{broken ? 'Defekt' : meta}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function UpgradeShelf({
  game,
  property,
  onInstall,
  onOpenResearch,
}: {
  game: GameState;
  property: GardenProperty;
  onInstall: (kind: TaskKind) => void;
  onOpenResearch: () => void;
}) {
  const steps = KINDS.map((kind) => {
    const installedLevel = property.equipment[kind];
    const unlockedLevel = game.unlocked[kind];
    if (installedLevel >= unlockedLevel) return { kind };
    const step = EQUIPMENT[kind][unlockedLevel];
    return {
      kind,
      step,
      price: step.installCost,
      affordable: game.money >= step.installCost,
    };
  });

  return (
    <>
      {/* Mobil: kompakte Zeilen */}
      <div className="shelf-rows">
        {steps.map(({ kind, step, price, affordable }) => (
          <div key={kind} className="shelf-row">
            <div className="shelf-row__text">
              <span className="shelf-row__name">
                {step ? step.name : 'Aktuell kein Upgrade verfügbar'}
              </span>
              <span className="shelf-row__desc">
                {TASK_LABELS[kind]} ·{' '}
                {step
                  ? step.description
                  : 'Im Upgrade-Bereich neues Wissen freischalten.'}
              </span>
            </div>
            {step && price !== undefined ? (
              <button
                type="button"
                className="shelf-row__buy"
                aria-label={`Für ${formatMoney(price)} kaufen`}
                disabled={!affordable}
                onClick={() => onInstall(kind)}
              >
                <span className="shelf-button__mobile">
                  {formatMoney(price)}
                </span>
              </button>
            ) : (
              <button
                type="button"
                className="shelf-row__research"
                onClick={onOpenResearch}
                aria-label={`Upgrades für ${TASK_LABELS[kind]} öffnen`}
              >
                <ShoppingBag aria-hidden="true" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Desktop: drei Karten */}
      <div className="shelf-cards">
        {steps.map(({ kind, step, price, affordable }) => (
          <div
            key={kind}
            className={`shelf-card ${step ? '' : 'shelf-card--empty'}`}
          >
            <span className="shelf-card__kind">{TASK_LABELS[kind]}</span>
            <span className="shelf-card__name">
              {step ? step.name : 'Aktuell kein Upgrade verfügbar'}
            </span>
            <span className="shelf-card__desc">
              {step
                ? step.description
                : 'Schalte im Upgrade-Bereich neues Wissen frei.'}
            </span>
            {step && price !== undefined ? (
              <button
                type="button"
                className="shelf-card__buy"
                aria-label={`Für ${formatMoney(price)} kaufen`}
                disabled={!affordable}
                onClick={() => onInstall(kind)}
              >
                {!affordable && <LockKeyhole aria-hidden="true" />}
                Für {formatMoney(price)} kaufen
              </button>
            ) : (
              <button
                type="button"
                className="shelf-card__research"
                onClick={onOpenResearch}
                aria-label={`Upgrades für ${TASK_LABELS[kind]} öffnen`}
              >
                <ShoppingBag aria-hidden="true" />
                Upgrades öffnen
              </button>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

function PropertyDetail({
  game,
  property,
  workerAvailable,
  onStart,
  onCancel,
  onInstall,
  onOpenResearch,
}: {
  game: GameState;
  property: GardenProperty;
  workerAvailable: boolean;
  onStart: (kind: TaskKind) => void;
  onCancel: (kind: TaskKind) => void;
  onInstall: (kind: TaskKind) => void;
  onOpenResearch: () => void;
}) {
  return (
    <section
      className="detail"
      aria-label={property.name}
      data-tutorial="property-detail"
    >
      <DetailHeader property={property} />

      {property.rescueUntil && (
        <div className="rescue">
          <CircleAlert className="rescue__icon" aria-hidden="true" />
          <div className="rescue__body">
            <p className="rescue__title">Vertrag akut gefährdet</p>
            <p className="rescue__note">
              Stelle die Zufriedenheit in den nächsten{' '}
              {formatDuration(property.rescueUntil - game.lastUpdatedAt)} wieder
              her.
            </p>
          </div>
        </div>
      )}

      <div className="panel">
        <div
          className="panel__section panel__section--values"
          data-tutorial="property-values"
        >
          <SectionLabel>Werte</SectionLabel>
          {/* Mobil Balken, ab Desktop Ringe */}
          <div className="gauges--bars">
            {KINDS.map((kind) => (
              <Gauge
                key={kind}
                kind={kind}
                value={propertyMetricPercent(property, kind)}
                variant="bar"
              />
            ))}
          </div>
          <div className="gauges--rings">
            {KINDS.map((kind) => (
              <div key={kind}>
                <Gauge
                  kind={kind}
                  value={propertyMetricPercent(property, kind)}
                  variant="ring"
                />
              </div>
            ))}
          </div>
        </div>

        <div
          className="panel__section panel__section--divided"
          data-tutorial="mow-action"
        >
          <SectionLabel trailing={payoutHint(property)}>Aktion</SectionLabel>
          <ActionButtons
            property={property}
            workerAvailable={workerAvailable}
            now={game.lastUpdatedAt}
            onStart={onStart}
            onCancel={onCancel}
          />
        </div>

        <div className="panel__section panel__section--divided">
          <SectionLabel>Neueste freigeschaltete Upgrades</SectionLabel>
          <UpgradeShelf
            game={game}
            property={property}
            onInstall={onInstall}
            onOpenResearch={onOpenResearch}
          />
        </div>
      </div>
    </section>
  );
}

/** Mobile Übersicht: Kartenstapel, jede Karte führt in die Detailseite. */
function MobileOverview({
  properties,
  workerAvailable,
  now,
  filter,
  onFilter,
  onOpen,
  onStart,
  onCancel,
}: {
  properties: GardenProperty[];
  workerAvailable: boolean;
  now: number;
  filter: FilterId | null;
  onFilter: (id: FilterId | null) => void;
  onOpen: (id: string) => void;
  onStart: (id: string, kind: TaskKind) => void;
  onCancel: (id: string, kind: TaskKind) => void;
}) {
  const match =
    FILTERS.find((entry) => entry.id === filter)?.match ?? (() => true);
  const visible = properties.filter(match);

  return (
    <div className="overview">
      <FilterChips
        properties={properties}
        active={filter}
        onChange={onFilter}
      />
      <div className="overview__list">
        {visible.length === 0 ? (
          <div className="overview__empty">
            <p>Kein Grundstück passt zu diesem Filter.</p>
          </div>
        ) : (
          visible.map((property) => (
            <div key={property.id} className="pcard">
              <button
                type="button"
                className="pcard__open"
                data-tutorial={
                  property.id === 'bergmann' ? 'property-card' : undefined
                }
                onClick={() => onOpen(property.id)}
                aria-label={`${property.name} öffnen`}
              >
                <span className="pcard__top">
                  <span className="pcard__titles">
                    <span className="pcard__name">{property.name}</span>
                    <span className="pcard__tags">
                      <StatusChip property={property} />
                      <span className="pcard__meta">
                        {property.size.toLocaleString('de-DE')} m² ·{' '}
                        {property.type}
                      </span>
                    </span>
                  </span>
                  <span className="pcard__score">
                    <span
                      className="pcard__score-value"
                      style={{
                        color: satisfactionColor(property.satisfaction),
                      }}
                    >
                      {Math.round(property.satisfaction)} %
                    </span>
                    <span className="pcard__score-label">Zufrieden</span>
                  </span>
                </span>
                <span className="pcard__gauges">
                  {KINDS.map((kind) => (
                    <Gauge
                      key={kind}
                      kind={kind}
                      value={propertyMetricPercent(property, kind)}
                      variant="bar"
                    />
                  ))}
                </span>
              </button>
              <div className="pcard__foot">
                <span className="pcard__hint">{urgentTaskHint(property)}</span>
                <ActionButtons
                  property={property}
                  workerAvailable={workerAvailable}
                  now={now}
                  onStart={(kind) => onStart(property.id, kind)}
                  onCancel={(kind) => onCancel(property.id, kind)}
                  compact
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function OffersView({
  game,
  onAccept,
  onDecline,
}: {
  game: GameState;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
}) {
  return (
    <section className="view">
      <div className="view__head">
        <div className="view__titles">
          <span className="view__eyebrow">Neue Stammkunden</span>
          <h2 className="view__title">Vertragsangebote</h2>
        </div>
      </div>

      {game.offers.length === 0 ? (
        <div className="empty">
          <div className="empty__inner">
            <span className="empty__icon">
              <BriefcaseBusiness />
            </span>
            <h3 className="empty__title">Noch keine passenden Anfragen</h3>
            <p className="empty__text">
              Pflege deine aktuellen Grundstücke weiter. Neue Anfragen
              erscheinen überraschend – und garantiert bei jeder neuen
              Reputationsstufe.
            </p>
          </div>
        </div>
      ) : (
        <div className="offers">
          {game.offers.map((offer) => (
            <div
              key={offer.id}
              className="offer"
              data-tutorial={
                offer.id === 'starter-bergmann' ? 'starter-offer' : undefined
              }
            >
              <div className="offer__head">
                <div className="offer__titles">
                  <span className="offer__name">{offer.name}</span>
                  <span className="offer__subtitle">{offer.subtitle}</span>
                </div>
                <span className="offer__type">{offer.type}</span>
              </div>
              <div className="offer__stats">
                <div className="stat">
                  <span className="stat__label">Fläche</span>
                  <p className="stat__value">
                    {offer.size.toLocaleString('de-DE')} m²
                  </p>
                </div>
                <div className="stat">
                  <span className="stat__label">Voller Schnitt</span>
                  <p className="stat__value">
                    {formatMoney(offer.payout * 1.2)}
                  </p>
                </div>
              </div>
              <dl className="offer__facts">
                <div className="offer__fact">
                  <dt>Wachstum</dt>
                  <dd>
                    {offer.growthFactor > 1.1
                      ? 'Schnell'
                      : offer.growthFactor < 0.98
                        ? 'Ruhig'
                        : 'Normal'}
                  </dd>
                </div>
                <div className="offer__fact">
                  <dt>Boden</dt>
                  <dd>
                    {offer.drainage > 1.1
                      ? 'Trocknet schnell'
                      : offer.drainage < 0.95
                        ? 'Speichert Wasser'
                        : 'Ausgeglichen'}
                  </dd>
                </div>
                <div className="offer__fact">
                  <dt>Anspruch</dt>
                  <dd>{offer.customerDemand > 1.2 ? 'Hoch' : 'Normal'}</dd>
                </div>
              </dl>
              <div className="offer__actions">
                <Button
                  variant="outline"
                  disabled={offer.id === 'starter-bergmann'}
                  onClick={() => onDecline(offer.id)}
                >
                  Ablehnen
                </Button>
                <Button
                  data-tutorial={
                    offer.id === 'starter-bergmann' ? 'accept-offer' : undefined
                  }
                  onClick={() => onAccept(offer.id)}
                >
                  Annehmen
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function equipmentBenefits(
  kind: TaskKind,
  current: EquipmentLevel,
  next: EquipmentLevel,
) {
  const speedIncrease = Math.round((current.speed / next.speed - 1) * 100);
  const speedLabel =
    kind === 'mow'
      ? 'Mähgeschwindigkeit'
      : kind === 'water'
        ? 'Bewässerungsgeschwindigkeit'
        : 'Reparaturgeschwindigkeit';
  const speedBenefit = {
    label: `${speedLabel} ${speedIncrease >= 0 ? '+' : '−'}${Math.abs(speedIncrease)} %`,
    tradeoff: speedIncrease < 0,
  };
  const benefits = speedBenefit.tradeoff ? [] : [speedBenefit];
  if (next.handsFree && !current.handsFree)
    benefits.push({
      label: 'Belegt nach dem Start keinen Mitarbeiter mehr',
      tradeoff: false,
    });
  if (next.automated && !current.automated)
    benefits.push({
      label: 'Startet bei Bedarf vollautomatisch',
      tradeoff: false,
    });
  if (speedBenefit.tradeoff) benefits.push(speedBenefit);
  return benefits;
}

type UpgradeTabId = TaskKind | 'workers' | 'care';
type UpgradeActionStatus =
  | 'available'
  | 'reputation'
  | 'sequence'
  | 'funds'
  | 'busy'
  | 'researching'
  | 'unlocked'
  | 'hired';

const UPGRADE_TABS: Array<{
  id: UpgradeTabId;
  label: string;
  Icon: typeof Sprout;
}> = [
  {
    id: 'mow',
    label: 'Mähen',
    Icon: Sprout,
  },
  {
    id: 'water',
    label: 'Bewässerung',
    Icon: Droplet,
  },
  {
    id: 'maintain',
    label: 'Reparatur',
    Icon: Wrench,
  },
  {
    id: 'workers',
    label: 'Mitarbeiter',
    Icon: Users,
  },
  {
    id: 'care',
    label: 'Pflege',
    Icon: FlaskConical,
  },
];

const CARE_UPGRADES = [
  {
    id: 'fertilizer' as const,
    name: 'Dünger',
    reputation: 8,
    cost: 700,
    description:
      'Beschleunigt das Rasenwachstum, erhöht aber zugleich den Wasserbedarf.',
    effects: ['Rasenwachstum +50 %', 'Mehr mögliche Mäherträge'],
  },
  {
    id: 'weedControl' as const,
    name: 'Unkrautpflege',
    reputation: 15,
    cost: 1_200,
    description:
      'Hält die Flächen sauber und erhöht den Ertrag jedes Schnitts.',
    effects: ['Mähertrag +8 %'],
  },
];

function UpgradeActionButton({
  status,
  reputation,
  cost,
  duration,
  actionLabel,
  onClick,
  title,
}: {
  status: UpgradeActionStatus;
  reputation: number;
  cost: number;
  duration?: number;
  actionLabel: 'Freischalten' | 'Einstellen';
  onClick?: () => void;
  title?: string;
}) {
  const available = status === 'available';
  let Icon = LockKeyhole;
  let label = `Reputation ${reputation}`;
  let meta = '';

  if (available) {
    Icon = actionLabel === 'Einstellen' ? UserPlus : Banknote;
    label = formatMoney(cost);
    meta = duration
      ? `${actionLabel} · ${formatDuration(duration)}`
      : actionLabel;
  } else if (status === 'sequence') {
    label = `Reputation ${reputation}`;
  } else if (status === 'funds') {
    Icon = Banknote;
    label = formatMoney(cost);
    meta = 'Guthaben reicht noch nicht';
  } else if (status === 'busy') {
    Icon = BookOpen;
    label = 'Weiterbildung belegt';
    meta = 'Ein Mitarbeiter wird benötigt';
  } else if (status === 'researching') {
    Icon = BookOpen;
    label = 'Wird gelernt';
    meta = 'Freischaltung läuft';
  } else if (status === 'unlocked') {
    Icon = Check;
    label = 'Freigeschaltet';
  } else if (status === 'hired') {
    Icon = Check;
    label = 'Eingestellt';
  }

  return (
    <Button
      className={`upgrade-action upgrade-action--${status}`}
      disabled={!available}
      title={title}
      onClick={onClick}
    >
      <span className="upgrade-action__label">
        <Icon aria-hidden="true" /> {label}
      </span>
      {meta && <span className="upgrade-action__meta">{meta}</span>}
    </Button>
  );
}

function upgradeResearchStatus(
  game: GameState,
  reputation: number,
  cost: number,
  isNext: boolean,
  isResearching: boolean,
): UpgradeActionStatus {
  if (isResearching) return 'researching';
  if (!isNext) return 'sequence';
  if (game.reputation < reputation) return 'reputation';
  if (game.money < cost) return 'funds';
  if (game.researchTask || availableWorkerId(game) === undefined) return 'busy';
  return 'available';
}

function UpgradeEffect({
  description,
  effects,
}: {
  description: string;
  effects: string[];
}) {
  return (
    <div className="upgrade-effect">
      <span className="upgrade-effect__description">{description}</span>
      {effects.length > 0 && (
        <ul className="upgrade-effect__list" aria-label="Effekte">
          {effects.map((effect) => (
            <li key={effect}>
              <Sparkles aria-hidden="true" /> {effect}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function UpgradesView({
  game,
  onUnlock,
  onUnlockChemistry,
  onHireWorker,
}: {
  game: GameState;
  onUnlock: (kind: TaskKind) => void;
  onUnlockChemistry: (kind: 'fertilizer' | 'weedControl') => void;
  onHireWorker: () => void;
}) {
  const [activeTab, setActiveTab] = useState<UpgradeTabId>('mow');
  const tabProgress = (tab: UpgradeTabId) => {
    if (tab === 'workers') return [game.workers, 4] as const;
    if (tab === 'care')
      return [
        Number(game.chemistryUnlocked.fertilizer) +
          Number(game.chemistryUnlocked.weedControl),
        CARE_UPGRADES.length,
      ] as const;
    return [game.unlocked[tab] + 1, EQUIPMENT[tab].length] as const;
  };

  return (
    <section className="view view--upgrades">
      <div className="upgrade-page__head">
        <div className="view__titles">
          <span className="view__eyebrow">Deinen Betrieb gezielt ausbauen</span>
          <h2 className="view__title">Upgrades</h2>
        </div>
      </div>

      <nav className="upgrade-tabs" aria-label="Upgrade-Bereiche">
        {UPGRADE_TABS.map(({ id, label, Icon }) => {
          const [current, total] = tabProgress(id);
          return (
            <button
              key={id}
              type="button"
              className={`upgrade-tab upgrade-tab--${id}`}
              aria-current={activeTab === id ? 'page' : undefined}
              onClick={() => setActiveTab(id)}
            >
              <span className="upgrade-tab__icon" aria-hidden="true">
                <Icon />
              </span>
              <span className="upgrade-tab__label">{label}</span>
              <span className="upgrade-tab__count">
                {current}/{total}
              </span>
            </button>
          );
        })}
      </nav>

      <table className={`upgrade-table upgrade-table--${activeTab}`}>
        <thead>
          <tr>
            <th scope="col">Stufe</th>
            <th scope="col">Upgrade</th>
            <th scope="col">Effekt</th>
            <th scope="col">
              <span className="sr-only">Status oder Aktion</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {(activeTab === 'mow' ||
            activeTab === 'water' ||
            activeTab === 'maintain') &&
            EQUIPMENT[activeTab].map((item, index) => {
              const unlocked = index <= game.unlocked[activeTab];
              const researching =
                game.researchTask?.kind === activeTab &&
                game.researchTask.targetLevel === index;
              const status = unlocked
                ? 'unlocked'
                : upgradeResearchStatus(
                    game,
                    item.reputation,
                    item.unlockCost,
                    index === game.unlocked[activeTab] + 1,
                    researching,
                  );
              const effects =
                index === 0
                  ? ['Grundausstattung']
                  : equipmentBenefits(
                      activeTab,
                      EQUIPMENT[activeTab][index - 1],
                      item,
                    ).map((benefit) => benefit.label);
              const title =
                status === 'sequence'
                  ? `Schalte zuerst Stufe ${index} frei.`
                  : status === 'reputation'
                    ? `Reputation ${item.reputation} erforderlich.`
                    : status === 'funds'
                      ? 'Nicht genug Vermögen.'
                      : status === 'busy'
                        ? game.researchTask
                          ? `Weiterbildung läuft: ${game.researchTask.name}`
                          : 'Alle Mitarbeiter sind beschäftigt.'
                        : undefined;

              return (
                <tr key={item.name} data-state={status}>
                  <td data-label="Stufe">
                    <span className="upgrade-level">{index + 1}</span>
                  </td>
                  <td data-label="Upgrade">
                    <span className="upgrade-name">{item.name}</span>
                    {item.automated && (
                      <span className="upgrade-badge">Automatisch</span>
                    )}
                    {item.handsFree && !item.automated && (
                      <span className="upgrade-badge">Freihändig</span>
                    )}
                  </td>
                  <td data-label="Effekt">
                    <UpgradeEffect
                      description={item.description}
                      effects={effects}
                    />
                  </td>
                  <td className="upgrade-table__action">
                    <UpgradeActionButton
                      status={status}
                      reputation={item.reputation}
                      cost={item.unlockCost}
                      duration={researchDurationMs(item.reputation)}
                      actionLabel="Freischalten"
                      onClick={() => onUnlock(activeTab)}
                      title={title}
                    />
                  </td>
                </tr>
              );
            })}

          {activeTab === 'workers' &&
            Array.from({ length: 4 }, (_, index) => {
              const workerNumber = index + 1;
              const config = WORKER_UPGRADES.find(
                (entry) => entry.workers === workerNumber,
              );
              const reputation = config?.reputation ?? 0;
              const cost = config?.cost ?? 0;
              const hired = workerNumber <= game.workers;
              const status: UpgradeActionStatus = hired
                ? 'hired'
                : workerNumber > game.workers + 1
                  ? 'sequence'
                  : game.reputation < reputation
                    ? 'reputation'
                    : game.money < cost
                      ? 'funds'
                      : 'available';
              return (
                <tr key={workerNumber} data-state={status}>
                  <td data-label="Stufe">
                    <span className="upgrade-level">{workerNumber}</span>
                  </td>
                  <td data-label="Upgrade">
                    <span className="upgrade-name">
                      Mitarbeiter {workerNumber}
                    </span>
                  </td>
                  <td data-label="Effekt">
                    <UpgradeEffect
                      description={
                        workerNumber === 1
                          ? 'Dein erster Mitarbeiter trägt den Betrieb von Anfang an.'
                          : 'Erweitert dein Team dauerhaft um einen Mitarbeiter.'
                      }
                      effects={[
                        `${workerNumber} parallele ${workerNumber === 1 ? 'Arbeit oder Weiterbildung' : 'Arbeiten oder Weiterbildungen'}`,
                      ]}
                    />
                  </td>
                  <td className="upgrade-table__action">
                    <UpgradeActionButton
                      status={status}
                      reputation={reputation}
                      cost={cost}
                      actionLabel="Einstellen"
                      onClick={onHireWorker}
                      title={
                        status === 'sequence'
                          ? `Stelle zuerst Mitarbeiter ${workerNumber - 1} ein.`
                          : status === 'reputation'
                            ? `Reputation ${reputation} erforderlich.`
                            : status === 'funds'
                              ? 'Nicht genug Vermögen.'
                              : undefined
                      }
                    />
                  </td>
                </tr>
              );
            })}

          {activeTab === 'care' &&
            CARE_UPGRADES.map((item, index) => {
              const unlocked = game.chemistryUnlocked[item.id];
              const researching = game.researchTask?.kind === item.id;
              const previousUnlocked =
                index === 0 || game.chemistryUnlocked.fertilizer;
              const status = unlocked
                ? 'unlocked'
                : upgradeResearchStatus(
                    game,
                    item.reputation,
                    item.cost,
                    previousUnlocked,
                    researching,
                  );
              return (
                <tr key={item.id} data-state={status}>
                  <td data-label="Stufe">
                    <span className="upgrade-level">{index + 1}</span>
                  </td>
                  <td data-label="Upgrade">
                    <span className="upgrade-name">{item.name}</span>
                  </td>
                  <td data-label="Effekt">
                    <UpgradeEffect
                      description={item.description}
                      effects={item.effects}
                    />
                  </td>
                  <td className="upgrade-table__action">
                    <UpgradeActionButton
                      status={status}
                      reputation={item.reputation}
                      cost={item.cost}
                      duration={researchDurationMs(item.reputation)}
                      actionLabel="Freischalten"
                      onClick={() => onUnlockChemistry(item.id)}
                      title={
                        status === 'sequence'
                          ? 'Schalte zuerst Dünger frei.'
                          : status === 'reputation'
                            ? `Reputation ${item.reputation} erforderlich.`
                            : status === 'funds'
                              ? 'Nicht genug Vermögen.'
                              : undefined
                      }
                    />
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>
    </section>
  );
}

export default function Home() {
  const {
    game,
    toasts,
    dismissToast,
    offlineSummary,
    dismissOfflineSummary,
    setTutorialStep,
    startTask,
    cancelTask,
    acceptOffer,
    declineOffer,
    unlockEquipment,
    installEquipment,
    unlockChemistry,
    hireWorker,
    resolveEvent,
    resetGame,
  } = useGame();
  const [view, setViewState] = useState<ViewName>('overview');
  const [selectedId, setSelectedId] = useState('bergmann');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [headerInfo, setHeaderInfo] = useState<'reputation' | 'weather' | null>(
    null,
  );
  const [filter, setFilter] = useState<FilterId | null>('all');
  const desktop = useDesktopLayout();
  // Nur mobil relevant: Desktop zeigt Liste und Detail ohnehin nebeneinander.
  const [mobileDetail, setMobileDetail] = useState(false);
  const setView = (nextView: ViewName) => {
    setViewState(nextView);
    setMobileDetail(false);
  };

  const selectedIdValid =
    game?.properties.some((property) => property.id === selectedId) ?? false;

  const selected = useMemo(
    () =>
      game?.properties.find((property) => property.id === selectedId) ??
      game?.properties[0],
    [game, selectedId],
  );

  if (!game) {
    return (
      <main className="app__loading">
        <div>
          <span className="app__loading-mark" />
          <p className="app__loading-text">Der Betrieb wird vorbereitet…</p>
        </div>
      </main>
    );
  }

  const assignments = workerAssignments(game);
  const workerAvailable = availableWorkerId(game) !== undefined;
  const upgradeCount = availableUpgradeCount(game);
  const displayView =
    game.tutorialStep !== null && game.tutorialStep <= 2 ? 'offers' : view;
  const displayMobileDetail =
    selectedIdValid &&
    (game.tutorialStep !== null && game.tutorialStep >= 3
      ? game.tutorialStep >= 4
      : mobileDetail);
  const tutorialOpen = game.tutorialStep !== null && !offlineSummary;
  const tutorialAction =
    game.tutorialStep === 2 ||
    game.tutorialStep === 7 ||
    (!desktop && game.tutorialStep === 3);

  const openProperty = (id: string) => {
    setSelectedId(id);
    setMobileDetail(true);
    if (!desktop && game.tutorialStep === 3) setTutorialStep(4);
  };

  const startGuidedTask = (propertyId: string, kind: TaskKind) => {
    startTask(propertyId, kind);
    if (kind === 'mow' && game.tutorialStep === 7) setTutorialStep(8);
  };

  const openAssignment = (assignment: WorkerAssignment) => {
    if (assignment.researchTask) {
      setView('upgrades');
      setMobileDetail(false);
      return;
    }
    if (!assignment.propertyId) return;
    setView('overview');
    openProperty(assignment.propertyId);
  };

  return (
    <main
      className={[
        'app',
        tutorialOpen && 'app--tutorial',
        tutorialAction && 'app--tutorial-action',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <AppHeader
        money={game.money}
        reputation={game.reputation}
        weather={game.weather}
        assignments={assignments}
        now={game.lastUpdatedAt}
        onAssignment={openAssignment}
        onReputation={() => setHeaderInfo('reputation')}
        onWeather={() => setHeaderInfo('weather')}
        onHome={() => setView('overview')}
      />
      <MobileHeader
        money={game.money}
        reputation={game.reputation}
        weather={game.weather}
        assignments={assignments}
        now={game.lastUpdatedAt}
        onAssignment={openAssignment}
        onReputation={() => setHeaderInfo('reputation')}
        onWeather={() => setHeaderInfo('weather')}
      />

      <div className="app__body">
        <ToastStack
          event={game.activeEvent}
          toasts={toasts}
          onResolveEvent={resolveEvent}
          onDismiss={dismissToast}
        />
        <SideNav
          view={displayView}
          setView={setView}
          settingsOpen={settingsOpen}
          onSettings={() => setSettingsOpen(true)}
          offerCount={game.offers.length}
          upgradeCount={upgradeCount}
        />
        <div className="app__main">
          {displayView === 'overview' && selected && (
            <>
              {/* Desktop: Liste links, Detail rechts */}
              <div className="overview-desktop" data-tutorial="property-layout">
                <PropertyList
                  properties={game.properties}
                  selectedId={selected.id}
                  filter={filter}
                  onFilter={setFilter}
                  onSelect={setSelectedId}
                />
                <PropertyDetail
                  game={game}
                  property={selected}
                  workerAvailable={workerAvailable}
                  onStart={(kind) => startGuidedTask(selected.id, kind)}
                  onCancel={(kind) => cancelTask(selected.id, kind)}
                  onInstall={(kind) => installEquipment(selected.id, kind)}
                  onOpenResearch={() => setView('upgrades')}
                />
              </div>

              {/* Mobil: Übersicht, per Tippen auf eine Kachel zur Detailseite */}
              {displayMobileDetail ? (
                <div className="detail-mobile">
                  <PropertyRail
                    properties={game.properties}
                    selectedId={selected.id}
                    onSelect={setSelectedId}
                  />
                  <PropertyDetail
                    game={game}
                    property={selected}
                    workerAvailable={workerAvailable}
                    onStart={(kind) => startGuidedTask(selected.id, kind)}
                    onCancel={(kind) => cancelTask(selected.id, kind)}
                    onInstall={(kind) => installEquipment(selected.id, kind)}
                    onOpenResearch={() => setView('upgrades')}
                  />
                </div>
              ) : (
                <MobileOverview
                  properties={game.properties}
                  workerAvailable={workerAvailable}
                  now={game.lastUpdatedAt}
                  filter={filter}
                  onFilter={setFilter}
                  onOpen={openProperty}
                  onStart={startGuidedTask}
                  onCancel={cancelTask}
                />
              )}
            </>
          )}
          {displayView === 'overview' && !selected && (
            <div className="app__scroll">
              <section className="view">
                <div className="empty">
                  <div className="empty__inner">
                    <span className="empty__icon">
                      <BriefcaseBusiness aria-hidden="true" />
                    </span>
                    <h2 className="empty__title">Noch kein aktiver Auftrag</h2>
                    <p className="empty__text">
                      Nimm zuerst ein Angebot an, um deinen Betrieb zu starten.
                    </p>
                  </div>
                </div>
              </section>
            </div>
          )}
          {displayView === 'offers' && (
            <div className="app__scroll">
              <OffersView
                game={game}
                onAccept={(id) => {
                  // Bei mehreren Angeboten bleibt die Liste stehen, damit weiter geprüft werden kann.
                  const wasLastOffer = game.offers.length <= 1;
                  const propertyId =
                    id === 'starter-bergmann' ? 'bergmann' : id;
                  acceptOffer(id);
                  setSelectedId(propertyId);
                  if (game.tutorialStep === 2) setTutorialStep(3);
                  if (wasLastOffer) setView('overview');
                }}
                onDecline={declineOffer}
              />
            </div>
          )}
          {displayView === 'upgrades' && (
            <div className="app__scroll">
              <UpgradesView
                game={game}
                onUnlock={unlockEquipment}
                onUnlockChemistry={unlockChemistry}
                onHireWorker={hireWorker}
              />
            </div>
          )}
        </div>
      </div>

      <MobileTabBar
        view={displayView}
        setView={setView}
        settingsOpen={settingsOpen}
        onSettings={() => setSettingsOpen(true)}
        offerCount={game.offers.length}
        upgradeCount={upgradeCount}
      />

      {tutorialOpen && game.tutorialStep !== null && (
        <Tutorial
          step={game.tutorialStep}
          desktop={desktop}
          onNext={() => {
            const step = game.tutorialStep;
            if (step === null) return;
            setTutorialStep(step === 11 ? null : step + 1);
          }}
          onSkip={() => {
            const step = game.tutorialStep;
            if (step !== null && step <= 2) setView('offers');
            setTutorialStep(null);
          }}
        />
      )}

      {headerInfo && (
        <HeaderInfoDialog
          kind={headerInfo}
          game={game}
          onClose={() => setHeaderInfo(null)}
        />
      )}

      {offlineSummary && (
        <div className="overlay" role="presentation">
          <dialog
            open
            aria-modal="true"
            aria-labelledby="offline-title"
            className="dialog summary"
          >
            <span className="summary__logo" aria-hidden="true" />
            <h2 id="offline-title" className="summary__title">
              Willkommen zurück
            </h2>
            <p className="summary__text">
              Dein Betrieb lief {humanOfflineDuration(offlineSummary.elapsedMs)}{' '}
              ohne dich weiter.
            </p>
            <div className="summary__stats">
              <div className="summary-stat">
                <Banknote aria-hidden="true" />
                <strong className="summary-stat__value">
                  {formatMoney(offlineSummary.earned)}
                </strong>
                <span className="summary-stat__label">verdient</span>
              </div>
              <div className="summary-stat">
                <Check aria-hidden="true" />
                <strong className="summary-stat__value">
                  {offlineSummary.completed}
                </strong>
                <span className="summary-stat__label">erledigt</span>
              </div>
              <div className="summary-stat summary-stat--warn">
                <CircleAlert aria-hidden="true" />
                <strong className="summary-stat__value">
                  {offlineSummary.critical}
                </strong>
                <span className="summary-stat__label">kritisch</span>
              </div>
            </div>
            <Button autoFocus onClick={dismissOfflineSummary}>
              Betrieb prüfen
            </Button>
          </dialog>
        </div>
      )}

      {settingsOpen && (
        <div className="overlay">
          <button
            type="button"
            className="overlay__backdrop"
            onClick={() => setSettingsOpen(false)}
            aria-label="Einstellungen schließen"
          />
          <dialog
            open
            aria-modal="true"
            aria-labelledby="settings-title"
            className="dialog dialog--narrow"
          >
            <div className="settings__head">
              <div>
                <h2 id="settings-title" className="settings__title">
                  Einstellungen
                </h2>
                <p className="settings__text">
                  Der Spielstand wird automatisch in diesem Browser gespeichert.
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Schließen"
                onClick={() => setSettingsOpen(false)}
              >
                <X />
              </Button>
            </div>
            <div className="danger">
              <p className="danger__title">Betrieb neu starten</p>
              <p className="danger__text">
                Entfernt Geld, Verträge und alle freigeschalteten Upgrades.
              </p>
              <Button
                variant="destructive"
                onClick={() => {
                  setSettingsOpen(false);
                  if (resetGame()) {
                    setView('offers');
                    setMobileDetail(false);
                  }
                }}
              >
                <RotateCcw /> Neu starten
              </Button>
            </div>
          </dialog>
        </div>
      )}
    </main>
  );
}
