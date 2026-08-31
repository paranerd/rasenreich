'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Banknote,
  BellRing,
  BriefcaseBusiness,
  Check,
  CircleAlert,
  CloudRain,
  CloudSun,
  FlaskConical,
  LayoutDashboard,
  LockKeyhole,
  RotateCcw,
  Settings2,
  ShoppingBag,
  Sparkles,
  Sun,
  Timer,
  Wrench,
  X,
} from 'lucide-react';

import { Button } from '@/components/button';
import { Gauge, metricToneColor } from '@/components/gauge';
import { Toast, useGame } from '@/hooks/use-game';
import {
  ACTION_LABELS,
  EQUIPMENT,
  formatDuration,
  formatMoney,
  GameEvent,
  GardenProperty,
  GameState,
  humanOfflineDuration,
  isAutomated,
  isBroken,
  maintenanceCost,
  mowingPayout,
  mowingPayoutShare,
  nextUnlockReputation,
  propertyMetricPercent,
  propertyStatus,
  TASK_LABELS,
  taskBlocksPlayer,
  taskPhase,
  taskTotalDuration,
  TaskKind,
  ViewName,
  wateringPayout,
} from '@/lib/game';

const KINDS: TaskKind[] = ['mow', 'water', 'maintain'];

/** Reine Zahl ohne Währung — der Kopf setzt das Eurozeichen eigenständig daneben. */
const amountFormatter = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 });

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

/**
 * Was der Schnitt einbringt, gemessen am bestmöglichen Ertrag. Während des
 * Mähens zählt der Rasen vom Start — der Lohn wurde dort eingefroren, obwohl
 * der Wert sichtbar mitläuft.
 */
function payoutHint(property: GardenProperty) {
  const running = property.task?.kind === 'mow' ? property.task : undefined;
  const grass = running?.startGrass ?? property.grass;
  const share = `${mowingPayoutShare(property, grass)} %`;
  if (grass > 100) return `${share} · überwachsen`;
  if (grass > 80) return `${share} · zu lang`;
  if (grass >= 60) return `${share} · im Fenster`;
  return `${share} · noch zu kurz`;
}

type FilterId = 'all' | 'due' | 'blocked' | 'auto';

function isBlocked(property: GardenProperty) {
  return isBroken(property) || Boolean(property.rescueUntil);
}

function isDue(property: GardenProperty) {
  return !property.task && !isBlocked(property) && property.grass >= 60;
}

function isAuto(property: GardenProperty) {
  return KINDS.some((kind) => isAutomated(property, kind));
}

const FILTERS: Array<{ id: FilterId; label: string; match: (property: GardenProperty) => boolean }> = [
  { id: 'all', label: 'Alle', match: () => true },
  { id: 'due', label: 'Fällig', match: isDue },
  { id: 'blocked', label: 'Blockiert', match: isBlocked },
  { id: 'auto', label: 'Automatik', match: isAuto },
];

/** Auffällige Zustände, die im Grundstücks-Scroller ein Symbol verdienen. */
function propertyFlags(property: GardenProperty) {
  const flags: Array<{ id: string; Icon: typeof Wrench; tone: string; label: string }> = [];
  if (property.rescueUntil) {
    flags.push({ id: 'rescue', Icon: CircleAlert, tone: 'danger', label: 'Vertrag gefährdet' });
  }
  if (isBroken(property)) {
    flags.push({ id: 'broken', Icon: Wrench, tone: 'danger', label: 'Gerät ausgefallen' });
  } else if (property.condition < 45) {
    flags.push({ id: 'wear', Icon: Wrench, tone: 'warning', label: 'Wartung fällig' });
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
    <span className={`dot tone--${status.tone} ${property.task ? 'pulse' : ''}`} aria-hidden="true" />
  );
}

function weatherLabel(weather: 'mild' | 'heat' | 'rain') {
  return weather === 'heat' ? 'Hitzewelle' : weather === 'rain' ? 'Regenschauer' : 'Mildes Wetter';
}

function WeatherBadge({ weather, className }: { weather: 'mild' | 'heat' | 'rain'; className?: string }) {
  const label = weatherLabel(weather);
  const Icon = weather === 'rain' ? CloudRain : weather === 'heat' ? Sun : CloudSun;
  const color =
    weather === 'heat' ? 'var(--tone-warn)' : weather === 'rain' ? 'var(--kind-water)' : 'var(--ink-mute)';
  return (
    <span className={`weather ${className ?? ''}`} title={label} aria-label={label}>
      <Icon style={{ color }} aria-hidden="true" />
    </span>
  );
}

/** Reputation als anteilig gefüllter Ring — eigene Farbe, damit sie kein Grundstückswert ist. */
function ReputationRing({ reputation }: { reputation: number }) {
  const next = nextUnlockReputation(reputation);
  const percent = Math.min(100, Math.max(0, (reputation / next) * 100));
  const circumference = 2 * Math.PI * 12;

  return (
    <span
      className="rep"
      title={`Reputation ${Math.floor(reputation)} — nächste Freischaltung bei ${next}`}
      role="meter"
      aria-valuemin={0}
      aria-valuemax={next}
      aria-valuenow={Math.floor(reputation)}
      aria-label={`Reputation ${Math.floor(reputation)} von ${next}`}
    >
      <svg className="rep__svg" width="30" height="30" viewBox="0 0 30 30" aria-hidden="true">
        <circle cx="15" cy="15" r="12" fill="none" stroke="var(--track)" strokeWidth="3.5" />
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
      <span className="rep__value">{Math.floor(reputation)}</span>
    </span>
  );
}

/** Arbeitsstatus unter dem Vermögen — springt in das arbeitende Grundstück. */
function ActivityButton({
  activeProperty,
  onOpen,
}: {
  activeProperty?: GardenProperty;
  onOpen: () => void;
}) {
  const task = activeProperty?.task;
  const busy = Boolean(task);

  return (
    <button
      type="button"
      className={`activity ${busy ? 'activity--busy' : ''}`}
      disabled={!busy}
      onClick={onOpen}
      title={busy ? `Zu ${activeProperty?.name} springen` : 'Kein Grundstück in Arbeit'}
    >
      <span className={`activity__dot ${busy ? 'pulse' : ''}`} aria-hidden="true" />
      <span className="activity__state">{busy ? 'Beschäftigt' : 'Verfügbar'}</span>
      {task && <span className="activity__time">{formatDuration(task.endsAt - Date.now())}</span>}
    </button>
  );
}

function AppHeader({
  money,
  reputation,
  weather,
  activeProperty,
  onActiveProperty,
  onHome,
}: {
  money: number;
  reputation: number;
  weather: 'mild' | 'heat' | 'rain';
  activeProperty?: GardenProperty;
  onActiveProperty: () => void;
  onHome: () => void;
}) {
  return (
    <header className="header">
      {/* Drei Spalten, damit das Vermögen unabhängig von den Seiten mittig steht */}
      <div className="header__inner">
        <button type="button" className="header__brand" onClick={onHome}>
          <span className="header__logo" />
          <span className="header__wordmark">GARDEN GRINDER</span>
        </button>

        <div className="header__money">
          <span className="header__money-label">Vermögen</span>
          <span className="header__money-value">{formatMoney(money)}</span>
          <ActivityButton activeProperty={activeProperty} onOpen={onActiveProperty} />
        </div>

        <div className="header__aside">
          <ReputationRing reputation={reputation} />
          <WeatherBadge weather={weather} />
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
}: {
  view: ViewName;
  setView: (view: ViewName) => void;
  settingsOpen: boolean;
  onSettings: () => void;
}) {
  const nav = [
    { id: 'overview' as const, label: 'Betrieb', icon: LayoutDashboard },
    { id: 'offers' as const, label: 'Angebote', icon: BriefcaseBusiness },
    { id: 'upgrades' as const, label: 'Technik', icon: ShoppingBag },
  ];

  return (
    <nav className="sidenav" aria-label="Hauptnavigation">
      {nav.map(({ id, label, icon: Icon }) => {
        const active = !settingsOpen && view === id;
        return (
          <button
            key={id}
            type="button"
            className={`sidenav__item ${active ? 'sidenav__item--active' : ''}`}
            onClick={() => setView(id)}
            aria-current={active ? 'page' : undefined}
          >
            <Icon aria-hidden="true" />
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
  activeProperty,
  onActiveProperty,
  onBack,
}: {
  money: number;
  reputation: number;
  weather: 'mild' | 'heat' | 'rain';
  activeProperty?: GardenProperty;
  onActiveProperty: () => void;
  onBack?: () => void;
}) {
  return (
    <header className="mobile-header">
      {onBack ? (
        <button
          type="button"
          className="mobile-header__back"
          onClick={onBack}
          aria-label="Zurück zur Übersicht"
        >
          <ArrowLeft aria-hidden="true" />
        </button>
      ) : (
        <span className="mobile-header__logo" aria-hidden="true" />
      )}
      <WeatherBadge weather={weather} className="mobile-header__weather" />

      <span className="mobile-header__label">Vermögen</span>
      <span className="mobile-header__money">
        <span className="mobile-header__amount">{amountFormatter.format(money)}</span>
        <span className="mobile-header__currency">€</span>
      </span>

      <ActivityButton activeProperty={activeProperty} onOpen={onActiveProperty} />

      <span className="mobile-header__rep">
        <ReputationRing reputation={reputation} />
      </span>
    </header>
  );
}

function MobileTabBar({
  view,
  setView,
  settingsOpen,
  onSettings,
}: {
  view: ViewName;
  setView: (view: ViewName) => void;
  settingsOpen: boolean;
  onSettings: () => void;
}) {
  const tabs = [
    { id: 'overview' as const, label: 'Grundstücke', icon: LayoutDashboard },
    { id: 'offers' as const, label: 'Aufträge', icon: BriefcaseBusiness },
    { id: 'upgrades' as const, label: 'Technik', icon: ShoppingBag },
    { id: 'settings' as const, label: 'Einstellungen', icon: Settings2 },
  ];

  return (
    <nav className="tabbar" aria-label="Hauptnavigation">
      {tabs.map(({ id, label, icon: Icon }) => {
        const active = id === 'settings' ? settingsOpen : !settingsOpen && view === id;
        return (
          <button
            key={id}
            type="button"
            className={`tabbar__item ${active ? 'tabbar__item--active' : ''}`}
            onClick={() => (id === 'settings' ? onSettings() : setView(id))}
            aria-current={active ? 'page' : undefined}
          >
            <Icon aria-hidden="true" />
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
  dismissRef.current = onDismiss;

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
          <span className="toast__timer" style={{ animationDuration: `${duration}ms` }} />
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
  active: FilterId;
  onChange: (id: FilterId) => void;
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
        const empty = chip.count === 0 && chip.id !== 'all';
        return (
          <button
            key={chip.id}
            type="button"
            className={`filter ${on ? 'filter--on' : ''} ${empty ? 'filter--empty' : ''}`}
            disabled={empty && !on}
            onClick={() => onChange(chip.id)}
            aria-pressed={on}
          >
            {chip.label}
            {chip.id !== 'all' && ` · ${chip.count}`}
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
  filter: FilterId;
  onFilter: (id: FilterId) => void;
  onSelect: (id: string) => void;
}) {
  const blocked = properties.filter(isBlocked).length;
  const match = FILTERS.find((entry) => entry.id === filter)?.match ?? (() => true);
  const visible = properties.filter(match);

  return (
    <aside className="plist">
      <div className="plist__head">
        <span className="plist__count">
          {filter === 'all'
            ? `${properties.length} ${properties.length === 1 ? 'Grundstück' : 'Grundstücke'}`
            : `${visible.length} von ${properties.length}`}
        </span>
        {blocked > 0 && <span className="plist__blocked">{blocked} blockiert</span>}
      </div>
      <FilterChips
        properties={properties}
        active={filter}
        onChange={onFilter}
        className="filters--divided"
      />
      <div className="plist__scroll">
        {visible.length === 0 && (
          <p className="plist__empty">Kein Grundstück passt zu diesem Filter.</p>
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
                  <Gauge key={kind} kind={kind} value={propertyMetricPercent(property, kind)} variant="mini" />
                ))}
              </span>
              <span className="plist__score" style={{ color: satisfactionColor(property.satisfaction) }}>
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
                  <Icon key={id} className={`rail__flag tone--${tone}`} aria-label={label}>
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
                    background: metricToneColor(kind, propertyMetricPercent(property, kind)),
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
        src={`${import.meta.env.BASE_URL}assets/garden-dashboard.png`}
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
                  · {property.completedJobs} {property.completedJobs === 1 ? 'Schnitt' : 'Schnitte'} ·{' '}
                  {formatMoney(property.lifetimeRevenue)} Umsatz
                </span>
              </span>
            </div>
          </div>
          <div className="detail-head__score">
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

function SectionLabel({ children, trailing }: { children: React.ReactNode; trailing?: React.ReactNode }) {
  return (
    <div className="section-label">
      <span className="section-label__text">{children}</span>
      {trailing && <span className="section-label__trailing">{trailing}</span>}
    </div>
  );
}

function ActionButtons({
  property,
  manualBusy,
  onStart,
  onCancel,
  compact = false,
}: {
  property: GardenProperty;
  manualBusy: boolean;
  onStart: (kind: TaskKind) => void;
  onCancel: () => void;
  compact?: boolean;
}) {
  const recommended = recommendedTask(property);

  return (
    <div className="actions">
      {KINDS.map((kind) => {
        const automatic = isAutomated(property, kind);
        const running = property.task?.kind === kind ? property.task : undefined;
        const progress = running
          ? Math.min(100, Math.max(0, ((Date.now() - running.startedAt) / (running.endsAt - running.startedAt)) * 100))
          : 0;
        const broken = isBroken(property, kind);
        // Die laufende Aufgabe bleibt bedienbar — ein Klick bricht sie ab.
        const disabled = !running && (Boolean(property.task) || (!automatic && manualBusy) || broken);
        // Die laufende Aktion traegt ihre eigene Darstellung, nicht die der Empfehlung.
        const on = kind === recommended && !disabled && !running;
        const duration = formatDuration(taskTotalDuration(property, kind) * 1_000);
        // Rüsten und Abschließen kosten eigene Zeit und heißen auch so.
        const phase = running ? taskPhase(running) : undefined;
        const phaseLabel =
          phase === 'setup' ? 'Rüsten' : phase === 'wrapup' ? 'Abschluss' : ACTION_LABELS[kind];
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
            className={`action ${compact ? 'action--compact' : ''} ${on ? 'action--on' : ''} ${
              running ? 'action--running' : ''
            } ${broken ? 'action--broken' : ''}`}
            disabled={disabled}
            title={running ? `${ACTION_LABELS[kind]} abbrechen` : undefined}
            onClick={() => (running ? onCancel() : onStart(kind))}
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
                  <X className="action__cancel" aria-hidden="true" />
                  {compact ? formatDuration(running.endsAt - Date.now()) : 'Abbrechen'}
                </>
              ) : compact && broken ? (
                'Defekt'
              ) : (
                ACTION_LABELS[kind]
              )}
            </span>
            {!compact && (
              <span className="action__meta">
                {running
                  ? `${phaseLabel} · ${formatDuration(running.endsAt - Date.now())}`
                  : broken
                    ? 'Defekt'
                    : meta}
              </span>
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
  onUnlock,
  onInstall,
}: {
  game: GameState;
  property: GardenProperty;
  onUnlock: (kind: TaskKind) => void;
  onInstall: (kind: TaskKind) => void;
}) {
  const steps = KINDS.map((kind) => {
    const installedLevel = property.equipment[kind];
    const unlockedLevel = game.unlocked[kind];
    const nextInstall = installedLevel < unlockedLevel ? EQUIPMENT[kind][installedLevel + 1] : undefined;
    const nextUnlock = EQUIPMENT[kind][unlockedLevel + 1];
    const step = nextInstall ?? nextUnlock;
    const isInstall = Boolean(nextInstall);
    const price = step ? (isInstall ? step.installCost : step.unlockCost) : 0;
    const affordable = step ? game.money >= price && (isInstall || game.reputation >= step.reputation) : false;
    return { kind, step, isInstall, price, affordable, installed: EQUIPMENT[kind][installedLevel] };
  });

  return (
    <>
      {/* Mobil: kompakte Zeilen */}
      <div className="shelf-rows">
        {steps.map(({ kind, step, isInstall, price, affordable, installed }) => (
          <div key={kind} className="shelf-row">
            <div className="shelf-row__text">
              <span className="shelf-row__name">{step ? step.name : installed.name}</span>
              <span className="shelf-row__desc">
                {TASK_LABELS[kind]} · {step ? step.description : 'Vollständig ausgebaut'}
              </span>
            </div>
            {step && (
              <button
                type="button"
                className="shelf-row__buy"
                disabled={!affordable}
                onClick={() => (isInstall ? onInstall(kind) : onUnlock(kind))}
              >
                {formatMoney(price)}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Desktop: drei Karten */}
      <div className="shelf-cards">
        {steps.map(({ kind, step, isInstall, price, affordable, installed }) => (
          <div key={kind} className="shelf-card">
            <span className="shelf-card__kind">{TASK_LABELS[kind]}</span>
            {step ? (
              <>
                <span className="shelf-card__name">{step.name}</span>
                <span className="shelf-card__desc">{step.description}</span>
                {!isInstall && game.reputation < step.reputation && (
                  <span className="shelf-card__lock">
                    <LockKeyhole aria-hidden="true" /> Reputation {step.reputation}
                  </span>
                )}
                <button
                  type="button"
                  className="shelf-card__buy"
                  disabled={!affordable}
                  onClick={() => (isInstall ? onInstall(kind) : onUnlock(kind))}
                >
                  {isInstall ? 'Anschaffen' : 'Forschen'} · {formatMoney(price)}
                </button>
              </>
            ) : (
              <>
                <span className="shelf-card__name">{installed.name}</span>
                <span className="shelf-card__done">
                  <Check aria-hidden="true" /> Vollständig ausgebaut
                </span>
              </>
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
  manualBusy,
  onStart,
  onCancel,
  onUnlock,
  onInstall,
}: {
  game: GameState;
  property: GardenProperty;
  manualBusy: boolean;
  onStart: (kind: TaskKind) => void;
  onCancel: () => void;
  onUnlock: (kind: TaskKind) => void;
  onInstall: (kind: TaskKind) => void;
}) {
  return (
    <section className="detail" aria-label={property.name}>
      <DetailHeader property={property} />

      {property.rescueUntil && (
        <div className="rescue">
          <CircleAlert className="rescue__icon" aria-hidden="true" />
          <div className="rescue__body">
            <p className="rescue__title">Vertrag akut gefährdet</p>
            <p className="rescue__note">
              Stelle die Zufriedenheit in den nächsten {formatDuration(property.rescueUntil - Date.now())} wieder her.
            </p>
          </div>
        </div>
      )}

      <div className="panel">
        <div className="panel__section panel__section--values">
          <SectionLabel>Werte</SectionLabel>
          {/* Mobil Balken, ab Desktop Ringe */}
          <div className="gauges--bars">
            {KINDS.map((kind) => (
              <Gauge key={kind} kind={kind} value={propertyMetricPercent(property, kind)} variant="bar" />
            ))}
          </div>
          <div className="gauges--rings">
            {KINDS.map((kind) => (
              <div key={kind}>
                <Gauge kind={kind} value={propertyMetricPercent(property, kind)} variant="ring" />
              </div>
            ))}
          </div>
        </div>

        <div className="panel__section panel__section--divided">
          <SectionLabel trailing={payoutHint(property)}>Aktion</SectionLabel>
          <ActionButtons
            property={property}
            manualBusy={manualBusy}
            onStart={onStart}
            onCancel={onCancel}
          />
        </div>

        <div className="panel__section panel__section--divided">
          <SectionLabel>Upgrades · nächster Schritt</SectionLabel>
          <UpgradeShelf game={game} property={property} onUnlock={onUnlock} onInstall={onInstall} />
        </div>
      </div>
    </section>
  );
}

/** Mobile Übersicht: Kartenstapel, jede Karte führt in die Detailseite. */
function MobileOverview({
  properties,
  manualBusy,
  filter,
  onFilter,
  onOpen,
  onStart,
  onCancel,
}: {
  properties: GardenProperty[];
  manualBusy: boolean;
  filter: FilterId;
  onFilter: (id: FilterId) => void;
  onOpen: (id: string) => void;
  onStart: (id: string, kind: TaskKind) => void;
  onCancel: (id: string) => void;
}) {
  const match = FILTERS.find((entry) => entry.id === filter)?.match ?? (() => true);
  const visible = properties.filter(match);

  return (
    <div className="overview">
      <FilterChips properties={properties} active={filter} onChange={onFilter} />
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
                onClick={() => onOpen(property.id)}
                aria-label={`${property.name} öffnen`}
              >
                <span className="pcard__top">
                  <span className="pcard__titles">
                    <span className="pcard__name">{property.name}</span>
                    <span className="pcard__tags">
                      <StatusChip property={property} />
                      <span className="pcard__meta">
                        {property.size.toLocaleString('de-DE')} m² · {property.type}
                      </span>
                    </span>
                  </span>
                  <span className="pcard__score">
                    <span
                      className="pcard__score-value"
                      style={{ color: satisfactionColor(property.satisfaction) }}
                    >
                      {Math.round(property.satisfaction)} %
                    </span>
                    <span className="pcard__score-label">Zufrieden</span>
                  </span>
                </span>
                <span className="pcard__gauges">
                  {KINDS.map((kind) => (
                    <Gauge key={kind} kind={kind} value={propertyMetricPercent(property, kind)} variant="bar" />
                  ))}
                </span>
              </button>
              <div className="pcard__foot">
                <span className="pcard__hint">{payoutHint(property)}</span>
                <ActionButtons
                  property={property}
                  manualBusy={manualBusy}
                  onStart={(kind) => onStart(property.id, kind)}
                  onCancel={() => onCancel(property.id)}
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
  const wait = Math.max(0, game.nextOfferAt - Date.now());

  return (
    <section className="view">
      <div className="view__head">
        <div className="view__titles">
          <span className="view__eyebrow">Neue Stammkunden</span>
          <h2 className="view__title">Vertragsangebote</h2>
        </div>
        <span className="timer-badge">
          <Timer aria-hidden="true" /> Nächste Prüfung in {formatDuration(wait)}
        </span>
      </div>

      {game.offers.length === 0 ? (
        <div className="empty">
          <div className="empty__inner">
            <span className="empty__icon">
              <BriefcaseBusiness />
            </span>
            <h3 className="empty__title">Noch keine passenden Anfragen</h3>
            <p className="empty__text">
              Pflege deine aktuellen Grundstücke weiter. Mit Reputation 2 werden erste Angebote
              freigeschaltet.
            </p>
          </div>
        </div>
      ) : (
        <div className="offers">
          {game.offers.map((offer) => (
            <div key={offer.id} className="offer">
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
                  <p className="stat__value">{offer.size.toLocaleString('de-DE')} m²</p>
                </div>
                <div className="stat">
                  <span className="stat__label">Optimal</span>
                  <p className="stat__value">{formatMoney(offer.payout * 1.2)}</p>
                </div>
              </div>
              <dl className="offer__facts">
                <div className="offer__fact">
                  <dt>Wachstum</dt>
                  <dd>{offer.growthFactor > 1.1 ? 'Schnell' : offer.growthFactor < 0.98 ? 'Ruhig' : 'Normal'}</dd>
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
                <Button variant="outline" onClick={() => onDecline(offer.id)}>
                  Ablehnen
                </Button>
                <Button onClick={() => onAccept(offer.id)}>Annehmen</Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function UpgradesView({
  game,
  selected,
  onUnlock,
  onInstall,
  onUnlockChemistry,
  onInstallChemistry,
}: {
  game: GameState;
  selected: GardenProperty;
  onUnlock: (kind: TaskKind) => void;
  onInstall: (kind: TaskKind) => void;
  onUnlockChemistry: (kind: 'fertilizer' | 'weedControl') => void;
  onInstallChemistry: (kind: 'fertilizer' | 'weedControl') => void;
}) {
  return (
    <section className="view">
      <div className="view__titles">
        <span className="view__eyebrow">Wissen freischalten, vor Ort investieren</span>
        <h2 className="view__title">Technik &amp; Pflege</h2>
        <p className="view__note">
          Ausgewähltes Grundstück: <strong>{selected.name}</strong>
        </p>
      </div>

      <div className="upgrades">
        {KINDS.map((kind) => {
          const unlockedLevel = game.unlocked[kind];
          const installedLevel = selected.equipment[kind];
          const current = EQUIPMENT[kind][installedLevel];
          const nextUnlock = EQUIPMENT[kind][unlockedLevel + 1];
          const nextInstall =
            installedLevel < unlockedLevel ? EQUIPMENT[kind][installedLevel + 1] : undefined;
          const canResearch =
            nextUnlock && game.reputation >= nextUnlock.reputation && game.money >= nextUnlock.unlockCost;

          return (
            <div key={kind} className="ucard">
              <div className="ucard__head">
                <span className="ucard__kind">{TASK_LABELS[kind]}</span>
                <span className="ucard__name">{current.name}</span>
                <span className="ucard__note">vor Ort installiert</span>
              </div>

              {nextInstall ? (
                <div className="ustep ustep--install">
                  <span className="ustep__label">Anschaffen</span>
                  <span className="ustep__name">{nextInstall.name}</span>
                  <span className="ustep__desc">{nextInstall.description}</span>
                  <Button disabled={game.money < nextInstall.installCost} onClick={() => onInstall(kind)}>
                    Für {formatMoney(nextInstall.installCost)} installieren
                  </Button>
                </div>
              ) : nextUnlock ? (
                <div className="ustep ustep--research">
                  <div className="ustep__head">
                    <span className="ustep__label">Nächste Forschung</span>
                    {game.reputation < nextUnlock.reputation && <LockKeyhole aria-hidden="true" />}
                  </div>
                  <span className="ustep__name">{nextUnlock.name}</span>
                  <span className="ustep__desc">{nextUnlock.description}</span>
                  <span className="ustep__req">Benötigt Reputation {nextUnlock.reputation}</span>
                  <Button variant="outline" disabled={!canResearch} onClick={() => onUnlock(kind)}>
                    Für {formatMoney(nextUnlock.unlockCost)} freischalten
                  </Button>
                </div>
              ) : (
                <div className="udone">
                  <Check aria-hidden="true" />
                  <span className="udone__title">Vollständig ausgebaut</span>
                  <span className="udone__text">Die beste Technik ist installiert.</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="care">
        <div className="care__head">
          <span className="care__title">
            <FlaskConical aria-hidden="true" /> Rasenpflege
          </span>
          <span className="care__note">Optionale Behandlungen mit klaren Vor- und Nachteilen.</span>
        </div>
        <div className="care__grid">
          {(
            [
              {
                id: 'fertilizer' as const,
                name: 'Dünger',
                rep: 8,
                unlock: 700,
                install: 110,
                description:
                  'Wachstum ×1,5 und Wasserbedarf ×1,3. Mehr Mähumsatz, aber auch mehr Arbeit.',
              },
              {
                id: 'weedControl' as const,
                name: 'Unkrautpflege',
                rep: 15,
                unlock: 1200,
                install: 180,
                description: 'Erhöht den Ertrag jedes Mähvorgangs um 8 %.',
              },
            ]
          ).map((item) => {
            const unlocked = game.chemistryUnlocked[item.id];
            const installed = selected[item.id];
            return (
              <div key={item.id} className="care-item">
                <div className="care-item__head">
                  <span className="care-item__name">{item.name}</span>
                  {installed && <span className="care-item__badge">Aktiv</span>}
                </div>
                <span className="care-item__desc">{item.description}</span>
                {!unlocked ? (
                  <Button
                    variant="outline"
                    disabled={game.reputation < item.rep || game.money < item.unlock}
                    onClick={() => onUnlockChemistry(item.id)}
                  >
                    Freischalten · {formatMoney(item.unlock)} · Rep. {item.rep}
                  </Button>
                ) : !installed ? (
                  <Button disabled={game.money < item.install} onClick={() => onInstallChemistry(item.id)}>
                    Für {formatMoney(item.install)} anwenden
                  </Button>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
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
    startTask,
    cancelTask,
    acceptOffer,
    declineOffer,
    unlockEquipment,
    installEquipment,
    unlockChemistry,
    installChemistry,
    resolveEvent,
    resetGame,
  } = useGame();
  const [view, setView] = useState<ViewName>('overview');
  const [selectedId, setSelectedId] = useState('bergmann');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [filter, setFilter] = useState<FilterId>('all');
  // Nur mobil relevant: Desktop zeigt Liste und Detail ohnehin nebeneinander.
  const [mobileDetail, setMobileDetail] = useState(false);

  useEffect(() => {
    if (game && !game.properties.some((property) => property.id === selectedId)) {
      setSelectedId(game.properties[0]?.id ?? 'bergmann');
      setMobileDetail(false);
    }
  }, [game, selectedId]);

  useEffect(() => {
    if (view !== 'overview') setMobileDetail(false);
  }, [view]);

  const selected = useMemo(
    () => game?.properties.find((property) => property.id === selectedId) ?? game?.properties[0],
    [game, selectedId],
  );

  if (!game || !selected) {
    return (
      <main className="app__loading">
        <div>
          <span className="app__loading-mark" />
          <p className="app__loading-text">Der Betrieb wird vorbereitet…</p>
        </div>
      </main>
    );
  }

  const manualBusy = game.properties.some((property) => property.task && taskBlocksPlayer(property.task));
  const activeProperty =
    game.properties.find((property) => property.task && taskBlocksPlayer(property.task)) ??
    game.properties.find((property) => property.task);

  const openProperty = (id: string) => {
    setSelectedId(id);
    setMobileDetail(true);
  };

  const jumpToActive = () => {
    if (!activeProperty) return;
    setView('overview');
    openProperty(activeProperty.id);
  };

  return (
    <main className="app">
      <AppHeader
        money={game.money}
        reputation={game.reputation}
        weather={game.weather}
        activeProperty={activeProperty}
        onActiveProperty={jumpToActive}
        onHome={() => setView('overview')}
      />
      <MobileHeader
        money={game.money}
        reputation={game.reputation}
        weather={game.weather}
        activeProperty={activeProperty}
        onActiveProperty={jumpToActive}
        onBack={view === 'overview' && mobileDetail ? () => setMobileDetail(false) : undefined}
      />

      <div className="app__body">
        <ToastStack
          event={game.activeEvent}
          toasts={toasts}
          onResolveEvent={resolveEvent}
          onDismiss={dismissToast}
        />
        <SideNav
          view={view}
          setView={setView}
          settingsOpen={settingsOpen}
          onSettings={() => setSettingsOpen(true)}
        />
        <div className="app__main">
          {view === 'overview' && (
            <>
              {/* Desktop: Liste links, Detail rechts */}
              <div className="overview-desktop">
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
                  manualBusy={manualBusy}
                  onStart={(kind) => startTask(selected.id, kind)}
                  onCancel={() => cancelTask(selected.id)}
                  onUnlock={unlockEquipment}
                  onInstall={(kind) => installEquipment(selected.id, kind)}
                />
              </div>

              {/* Mobil: Übersicht, per Tippen auf eine Kachel zur Detailseite */}
              {mobileDetail ? (
                <div className="detail-mobile">
                  <PropertyRail properties={game.properties} selectedId={selected.id} onSelect={setSelectedId} />
                  <PropertyDetail
                    game={game}
                    property={selected}
                    manualBusy={manualBusy}
                    onStart={(kind) => startTask(selected.id, kind)}
                    onCancel={() => cancelTask(selected.id)}
                    onUnlock={unlockEquipment}
                    onInstall={(kind) => installEquipment(selected.id, kind)}
                  />
                </div>
              ) : (
                <MobileOverview
                  properties={game.properties}
                  manualBusy={manualBusy}
                  filter={filter}
                  onFilter={setFilter}
                  onOpen={openProperty}
                  onStart={startTask}
                  onCancel={cancelTask}
                />
              )}
            </>
          )}
          {view === 'offers' && (
            <div className="app__scroll">
              <OffersView
                game={game}
                onAccept={(id) => {
                  // Bei mehreren Angeboten bleibt die Liste stehen, damit weiter geprüft werden kann.
                  const wasLastOffer = game.offers.length <= 1;
                  acceptOffer(id);
                  if (wasLastOffer) setView('overview');
                }}
                onDecline={declineOffer}
              />
            </div>
          )}
          {view === 'upgrades' && (
            <div className="app__scroll">
              <UpgradesView
                game={game}
                selected={selected}
                onUnlock={unlockEquipment}
                onInstall={(kind) => installEquipment(selected.id, kind)}
                onUnlockChemistry={unlockChemistry}
                onInstallChemistry={(kind) => installChemistry(selected.id, kind)}
              />
            </div>
          )}
        </div>
      </div>

      <MobileTabBar
        view={view}
        setView={setView}
        settingsOpen={settingsOpen}
        onSettings={() => setSettingsOpen(true)}
      />

      {offlineSummary && (
        <div className="overlay" role="presentation">
          <section role="dialog" aria-modal="true" aria-labelledby="offline-title" className="dialog summary">
            <span className="summary__logo" aria-hidden="true" />
            <h2 id="offline-title" className="summary__title">
              Willkommen zurück
            </h2>
            <p className="summary__text">
              Dein Betrieb lief {humanOfflineDuration(offlineSummary.elapsedMs)} ohne dich weiter.
            </p>
            <div className="summary__stats">
              <div className="summary-stat">
                <Banknote aria-hidden="true" />
                <strong className="summary-stat__value">{formatMoney(offlineSummary.earned)}</strong>
                <span className="summary-stat__label">verdient</span>
              </div>
              <div className="summary-stat">
                <Check aria-hidden="true" />
                <strong className="summary-stat__value">{offlineSummary.completed}</strong>
                <span className="summary-stat__label">erledigt</span>
              </div>
              <div className="summary-stat summary-stat--warn">
                <CircleAlert aria-hidden="true" />
                <strong className="summary-stat__value">{offlineSummary.critical}</strong>
                <span className="summary-stat__label">kritisch</span>
              </div>
            </div>
            <Button autoFocus onClick={dismissOfflineSummary}>
              Betrieb prüfen
            </Button>
          </section>
        </div>
      )}

      {settingsOpen && (
        <div className="overlay" onMouseDown={() => setSettingsOpen(false)}>
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-title"
            className="dialog dialog--narrow"
            onMouseDown={(event) => event.stopPropagation()}
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
              <Button variant="ghost" size="icon" aria-label="Schließen" onClick={() => setSettingsOpen(false)}>
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
                  resetGame();
                }}
              >
                <RotateCcw /> Neu starten
              </Button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
