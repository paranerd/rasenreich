'use client';

import { useEffect, useMemo, useState } from 'react';
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
  X,
} from 'lucide-react';

import { Gauge } from '@/components/gauge';
import { Button } from '@/components/ui/button';
import { useGame } from '@/hooks/use-game';
import {
  ACTION_LABELS,
  EQUIPMENT,
  formatDuration,
  formatMoney,
  GardenProperty,
  GameState,
  humanOfflineDuration,
  isAutomated,
  maintenanceCost,
  mowingPayout,
  nextUnlockReputation,
  propertyMetricPercent,
  propertyStatus,
  TASK_LABELS,
  taskBlocksPlayer,
  taskDuration,
  TaskKind,
  ViewName,
} from '@/lib/game';

const KINDS: TaskKind[] = ['mow', 'water', 'maintain'];

const STATUS_COLOR = {
  danger: { color: 'var(--tone-bad)', bg: '#f6e3dd' },
  warning: { color: 'var(--tone-warn)', bg: '#f6ead6' },
  info: { color: 'var(--kind-water)', bg: '#e0edf1' },
  good: { color: 'var(--tone-ok)', bg: '#e8efdf' },
  neutral: { color: 'var(--ink-mute)', bg: '#eceadf' },
} as const;

const LOGO_STRIPES = 'repeating-linear-gradient(90deg,#4f7a2f 0 4px,#679a3f 4px 8px)';

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

/** Welche Aufgabe der Betrieb als Nächstes braucht — steuert die hervorgehobene Schaltfläche. */
function recommendedTask(property: GardenProperty): TaskKind {
  if (property.condition < 35) return 'maintain';
  if (property.moisture < 50) return 'water';
  return 'mow';
}

/** Was der Kunde für den Schnitt zahlt, in der Sprache des Optimalfensters. */
function payoutHint(property: GardenProperty) {
  if (property.grass > 100) return 'Voll, aber −Zufriedenheit';
  if (property.grass > 80) return 'Voll · +50 % Dauer';
  if (property.grass >= 60) return '100 % · im Fenster';
  return `${Math.round((property.grass / 60) * 100)} % · zu kurz`;
}

type FilterId = 'all' | 'due' | 'blocked' | 'auto';

function isBlocked(property: GardenProperty) {
  return property.condition <= 0 || Boolean(property.rescueUntil);
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

function StatusChip({ property }: { property: GardenProperty }) {
  const status = propertyStatus(property);
  const tone = STATUS_COLOR[status.tone];
  return (
    <span
      className="shrink-0 whitespace-nowrap rounded-[5px] px-[7px] py-1 font-mono text-[9px] font-semibold uppercase leading-none tracking-[0.08em]"
      style={{ background: tone.bg, color: tone.color }}
    >
      {status.label}
    </span>
  );
}

function StatusDot({ property }: { property: GardenProperty }) {
  const status = propertyStatus(property);
  return (
    <span
      className={`size-2 shrink-0 rounded-full ${property.task ? 'rr-pulse' : ''}`}
      style={{ background: STATUS_COLOR[status.tone].color }}
      aria-hidden="true"
    />
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
    <span className={className} title={label} aria-label={label}>
      <Icon className="size-4" style={{ color }} aria-hidden="true" />
    </span>
  );
}

/** Gleicher Aufbau für alle Kopfkacheln: Titel oben links, Wert darunter. */
const HEADER_TILE = 'flex h-[60px] shrink-0 flex-col justify-center gap-1.5 rounded-[9px] border px-3.5';

/** Reputation als anteilig gefüllter Ring — eigene Farbe, damit sie kein Grundstückswert ist. */
function ReputationRing({ reputation }: { reputation: number }) {
  const next = nextUnlockReputation(reputation);
  const percent = Math.min(100, Math.max(0, (reputation / next) * 100));
  const circumference = 2 * Math.PI * 12;

  return (
    <span
      className="relative grid size-[30px] shrink-0 place-items-center"
      title={`Reputation ${Math.floor(reputation)} — nächste Freischaltung bei ${next}`}
      role="meter"
      aria-valuemin={0}
      aria-valuemax={next}
      aria-valuenow={Math.floor(reputation)}
      aria-label={`Reputation ${Math.floor(reputation)} von ${next}`}
    >
      <svg width="30" height="30" viewBox="0 0 30 30" className="absolute inset-0 -rotate-90" aria-hidden="true">
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
      <span
        className="relative font-mono text-[11px] font-semibold leading-none tabular-nums"
        style={{ color: 'var(--rep)' }}
      >
        {Math.floor(reputation)}
      </span>
    </span>
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
  const task = activeProperty?.task;
  const busy = Boolean(task);

  return (
    <header className="hidden shrink-0 border-b border-border bg-paper lg:block">
      <div className="mx-auto flex max-w-[1540px] items-center gap-2.5 px-5 py-2.5">
        <button
          className="flex shrink-0 items-center gap-2.5 rounded-lg text-left focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          onClick={onHome}
        >
          <span className="size-[26px] shrink-0 rounded-[5px]" style={{ background: LOGO_STRIPES }} />
          <span className="text-[13px] font-bold leading-none tracking-[0.14em] text-ink">GARDEN GRINDER</span>
        </button>

        <div className="ml-auto flex items-center gap-2.5">
          <div className={HEADER_TILE} style={{ background: '#eef2e6', borderColor: 'rgba(79,122,47,.28)' }}>
            <span className="rr-label text-[8.5px] leading-none tracking-[0.16em]">Vermögen</span>
            <span className="font-mono text-[22px] font-semibold leading-none tracking-[-0.02em] text-ink tabular-nums">
              {formatMoney(money)}
            </span>
          </div>

          <div className={`${HEADER_TILE} border-border bg-surface`}>
            <span className="rr-label text-[8.5px] leading-none tracking-[0.16em]">Reputation</span>
            <ReputationRing reputation={reputation} />
          </div>

          <button
            type="button"
            className={`${HEADER_TILE} items-start text-left disabled:cursor-default`}
            style={{
              background: busy ? '#e8efdf' : 'var(--surface)',
              borderColor: busy ? 'rgba(79,122,47,.35)' : 'var(--border)',
            }}
            disabled={!busy}
            onClick={onActiveProperty}
            title={busy ? `Zu ${activeProperty?.name} springen` : 'Kein Grundstück in Arbeit'}
          >
            <span className="rr-label text-[8.5px] leading-none tracking-[0.16em]">Status</span>
            <span className="flex items-center gap-2">
              <span
                className={`size-2 shrink-0 rounded-full ${busy ? 'rr-pulse' : ''}`}
                style={{ background: busy ? '#4f7a2f' : '#a8b394' }}
                aria-hidden="true"
              />
              <span className="whitespace-nowrap text-[13px] font-semibold leading-none text-ink">
                {busy ? 'Beschäftigt' : 'Verfügbar'}
              </span>
              {task && (
                <span className="whitespace-nowrap font-mono text-[13px] font-semibold leading-none text-ink-soft tabular-nums">
                  {formatDuration(task.endsAt - Date.now())}
                </span>
              )}
            </span>
          </button>

          <div className={`${HEADER_TILE} border-border bg-surface`}>
            <span className="rr-label text-[8.5px] leading-none tracking-[0.16em]">Wetter</span>
            <span className="flex items-center gap-2">
              <WeatherBadge weather={weather} className="shrink-0" />
              <span className="whitespace-nowrap text-[13px] font-semibold leading-none text-ink">
                {weatherLabel(weather)}
              </span>
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

const SIDE_NAV_ITEM = 'flex flex-col items-center gap-1.5 rounded-[9px] px-1 py-2.5';

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
    <nav
      className="hidden w-20 shrink-0 flex-col gap-1 border-r border-border bg-paper p-2 lg:flex"
      aria-label="Hauptnavigation"
    >
      {nav.map(({ id, label, icon: Icon }) => {
        const active = !settingsOpen && view === id;
        return (
          <button
            key={id}
            type="button"
            className={SIDE_NAV_ITEM}
            style={{ background: active ? '#eef2e6' : 'transparent' }}
            onClick={() => setView(id)}
            aria-current={active ? 'page' : undefined}
          >
            <Icon className="size-[18px]" style={{ color: active ? '#3f6b28' : '#a8b394' }} aria-hidden="true" />
            <span
              className="text-[9.5px] font-semibold leading-none"
              style={{ color: active ? 'var(--ink)' : 'var(--ink-mute)' }}
            >
              {label}
            </span>
          </button>
        );
      })}

      <button
        type="button"
        className={`${SIDE_NAV_ITEM} mt-auto border-t border-border/70 pt-3.5`}
        style={{ background: settingsOpen ? '#eef2e6' : 'transparent' }}
        onClick={onSettings}
        aria-current={settingsOpen ? 'page' : undefined}
      >
        <Settings2
          className="size-[18px]"
          style={{ color: settingsOpen ? '#3f6b28' : '#a8b394' }}
          aria-hidden="true"
        />
        <span
          className="text-[9.5px] font-semibold leading-none"
          style={{ color: settingsOpen ? 'var(--ink)' : 'var(--ink-mute)' }}
        >
          Einstellungen
        </span>
      </button>
    </nav>
  );
}

/** Mobiler Kopf aus Entwurf 2a: Vermögen als größte Zahl, darunter der Ruf. */
function MobileHeader({
  money,
  reputation,
  weather,
  onBack,
}: {
  money: number;
  reputation: number;
  weather: 'mild' | 'heat' | 'rain';
  onBack?: () => void;
}) {
  const nextRep = nextUnlockReputation(reputation);
  const repPercent = Math.min(100, (reputation / nextRep) * 100);

  return (
    <header className="relative flex shrink-0 flex-col items-center gap-[7px] border-b border-border bg-paper px-4 pb-3 pt-3 lg:hidden">
      {onBack ? (
        <button
          type="button"
          className="absolute left-1.5 top-1.5 grid size-11 place-items-center rounded-[9px] text-primary"
          onClick={onBack}
          aria-label="Zurück zur Übersicht"
        >
          <ArrowLeft className="size-5" aria-hidden="true" />
        </button>
      ) : (
        <span
          className="absolute left-4 top-3.5 size-[26px] rounded-md"
          style={{ background: LOGO_STRIPES }}
          aria-hidden="true"
        />
      )}
      <WeatherBadge weather={weather} className="absolute right-4 top-3.5 grid size-7 place-items-center" />

      <span className="rr-label text-[8.5px] leading-none tracking-[0.16em]">Vermögen</span>
      <span className="flex items-baseline gap-1">
        <span className="font-mono text-[34px] font-semibold leading-none tracking-[-0.02em] text-ink tabular-nums">
          {amountFormatter.format(money)}
        </span>
        <span className="font-mono text-[17px] font-semibold leading-none text-ink-soft">€</span>
      </span>
      <span className="flex items-center gap-[7px]">
        <span className="rr-label text-[8.5px] leading-none tracking-[0.14em]">Ruf</span>
        <span className="relative h-[5px] w-14 overflow-hidden rounded-full bg-track">
          <span className="absolute inset-y-0 left-0 bg-tone-ok" style={{ width: `${repPercent}%` }} />
        </span>
        <span className="font-mono text-[11.5px] font-semibold leading-none text-ink-soft tabular-nums">
          {Math.floor(reputation)}
        </span>
      </span>
    </header>
  );
}

/** Laufband über der Kartenliste, sobald irgendwo gearbeitet wird. */
function BusyBanner({ property, onOpen }: { property: GardenProperty; onOpen: () => void }) {
  const task = property.task;
  if (!task) return null;
  return (
    <div
      className="flex shrink-0 items-center gap-2.5 border-b py-1.5 pl-4 pr-2.5 lg:hidden"
      style={{ background: '#e8efdf', borderColor: 'rgba(79,122,47,.25)' }}
    >
      <span className="rr-pulse size-2 shrink-0 rounded-full" style={{ background: '#4f7a2f' }} aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate text-xs font-semibold leading-none text-ink">
        {ACTION_LABELS[task.kind]} · {property.name}
      </span>
      <span className="font-mono text-xs font-semibold leading-none" style={{ color: '#3f6b28' }}>
        {formatDuration(task.endsAt - Date.now())}
      </span>
      <button
        type="button"
        className="flex min-h-11 shrink-0 items-center rounded-lg border bg-paper px-3.5 text-xs font-semibold"
        style={{ borderColor: 'rgba(63,107,40,.45)', color: '#3f6b28' }}
        onClick={onOpen}
      >
        Ansehen
      </button>
    </div>
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
    <nav
      className="flex shrink-0 border-t border-border bg-paper px-2 pt-2 lg:hidden"
      style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
      aria-label="Hauptnavigation"
    >
      {tabs.map(({ id, label, icon: Icon }) => {
        const active = id === 'settings' ? settingsOpen : !settingsOpen && view === id;
        return (
          <button
            key={id}
            type="button"
            className="flex flex-1 flex-col items-center gap-1.5 rounded-[9px] px-0 pb-[7px] pt-[9px]"
            style={{ background: active ? '#eef2e6' : 'transparent' }}
            onClick={() => (id === 'settings' ? onSettings() : setView(id))}
            aria-current={active ? 'page' : undefined}
          >
            <Icon className="size-[18px]" style={{ color: active ? '#3f6b28' : '#a8b394' }} aria-hidden="true" />
            <span
              className="text-[10px] font-semibold leading-none"
              style={{ color: active ? 'var(--ink)' : 'var(--ink-mute)' }}
            >
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

function FilterChips({
  properties,
  active,
  onChange,
}: {
  properties: GardenProperty[];
  active: FilterId;
  onChange: (id: FilterId) => void;
}) {
  const chips = FILTERS.map((filter) => ({
    ...filter,
    count: properties.filter(filter.match).length,
  })).filter((filter) => filter.id === 'all' || filter.count > 0);

  // Eine einzelne "Alle"-Schaltfläche filtert nichts — dann bleibt die Leiste weg.
  if (chips.length < 2) return null;

  return (
    <div className="flex shrink-0 gap-[7px] overflow-x-auto px-4 py-2.5">
      {chips.map((chip) => {
        const on = chip.id === active;
        return (
          <button
            key={chip.id}
            type="button"
            className="shrink-0 whitespace-nowrap rounded-lg border px-[13px] py-[9px] text-xs font-semibold leading-none"
            style={{
              background: on ? 'var(--ink)' : 'var(--paper)',
              color: on ? 'var(--surface)' : 'var(--ink-soft)',
              borderColor: on ? 'var(--ink)' : 'rgba(36,41,31,.14)',
            }}
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

/** Dichte Liste links auf Desktop (Entwurf 3b). */
function PropertyList({
  properties,
  selectedId,
  onSelect,
}: {
  properties: GardenProperty[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const blocked = properties.filter(isBlocked).length;

  return (
    <aside className="hidden w-[392px] shrink-0 flex-col border-r border-border bg-paper lg:flex">
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
        <span className="rr-label text-[11px] leading-none tracking-[0.12em] text-ink-soft">
          {properties.length} {properties.length === 1 ? 'Grundstück' : 'Grundstücke'}
        </span>
        {blocked > 0 && (
          <span
            className="font-mono text-[10px] font-medium uppercase leading-none"
            style={{ color: 'var(--tone-bad)' }}
          >
            {blocked} blockiert
          </span>
        )}
      </div>
      <div className="flex-1 overflow-y-auto">
        {properties.map((property) => {
          const selected = property.id === selectedId;
          return (
            <button
              key={property.id}
              className="flex w-full items-center gap-3 border-b border-border/40 px-4 py-3 text-left transition-colors"
              style={{
                background: selected ? '#e8efdf' : 'transparent',
                boxShadow: selected ? 'inset 3px 0 0 var(--primary)' : 'none',
              }}
              onClick={() => onSelect(property.id)}
              aria-current={selected ? 'true' : undefined}
            >
              <StatusDot property={property} />
              <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                <span className="truncate text-[12.5px] font-semibold leading-tight text-ink">{property.name}</span>
                <span className="truncate font-mono text-[9.5px] font-medium leading-none text-ink-mute">
                  {property.size.toLocaleString('de-DE')} m² · {property.type}
                </span>
              </span>
              <span className="flex w-[60px] shrink-0 flex-col gap-[3px]" aria-hidden="true">
                {KINDS.map((kind) => (
                  <Gauge key={kind} kind={kind} value={propertyMetricPercent(property, kind)} variant="mini" />
                ))}
              </span>
              <span
                className="shrink-0 whitespace-nowrap font-mono text-[13px] font-semibold leading-none tabular-nums"
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

/** Waagerechte Leiste über der mobilen Detailansicht (Entwurf 3a). */
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
    <div className="flex shrink-0 gap-2 overflow-x-auto border-b border-border bg-paper px-4 py-2.5 lg:hidden">
      {properties.map((property) => {
        const selected = property.id === selectedId;
        return (
          <button
            key={property.id}
            className="flex shrink-0 flex-col gap-1.5 rounded-lg border px-3 py-2 text-left"
            style={{
              background: selected ? '#e8efdf' : 'var(--surface)',
              borderColor: selected ? 'rgba(79,122,47,.45)' : 'rgba(36,41,31,.1)',
            }}
            onClick={() => onSelect(property.id)}
            aria-current={selected ? 'true' : undefined}
          >
            <span className="flex items-center gap-1.5">
              <StatusDot property={property} />
              <span className="whitespace-nowrap text-[11px] font-semibold leading-none text-ink">
                {property.name}
              </span>
            </span>
            <span className="flex gap-[3px]" aria-hidden="true">
              {KINDS.map((kind) => (
                <span
                  key={kind}
                  className="size-[9px] rounded-[2px]"
                  style={{
                    background: `var(--kind-${kind === 'mow' ? 'grass' : kind === 'water' ? 'water' : 'cond'})`,
                    opacity: propertyMetricPercent(property, kind) < 25 ? 0.45 : 1,
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
    <div className="relative min-h-[164px] overflow-hidden rounded-xl border border-border lg:flex-1">
      <img
        src="/assets/garden-dashboard.png"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 size-full object-cover"
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to top, rgba(23,49,31,.95) 0%, rgba(23,49,31,.80) 45%, rgba(23,49,31,.62) 100%)',
        }}
        aria-hidden="true"
      />
      <div className="relative flex h-full flex-col justify-end p-4 sm:p-5">
        <div className="flex items-start gap-4 sm:gap-5">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span
            className="font-mono text-[10px] font-medium uppercase leading-none tracking-[0.12em]"
            style={{ color: 'rgba(255,253,247,.62)' }}
          >
            {property.subtitle}
          </span>
          <h2 className="text-[22px] font-bold leading-tight text-white sm:text-[27px]">{property.name}</h2>
          <div className="flex flex-wrap items-center gap-2.5">
            <StatusChip property={property} />
            <span
              className="font-mono text-[10.5px] font-medium leading-none"
              style={{ color: 'rgba(255,253,247,.72)' }}
            >
              {property.size.toLocaleString('de-DE')} m² · {property.type}
              <span className="hidden sm:inline">
                {' '}
                · {property.completedJobs} {property.completedJobs === 1 ? 'Schnitt' : 'Schnitte'} ·{' '}
                {formatMoney(property.lifetimeRevenue)} Umsatz
              </span>
            </span>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span
            className="font-mono text-[9.5px] font-semibold uppercase leading-none tracking-[0.12em]"
            style={{ color: 'rgba(255,253,247,.62)' }}
          >
            <span className="sm:hidden">Zufrieden</span>
            <span className="hidden sm:inline">Zufriedenheit</span>
          </span>
          <span
            className="font-mono text-[24px] font-semibold leading-none tabular-nums sm:text-[30px]"
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
    <div className="flex items-baseline justify-between gap-3">
      <span className="rr-label text-[9.5px] leading-none">{children}</span>
      {trailing && (
        <span className="rr-label text-[9.5px] font-medium leading-none tracking-[0.08em] normal-case">
          {trailing}
        </span>
      )}
    </div>
  );
}

function ActionButtons({
  property,
  manualBusy,
  onStart,
  compact = false,
}: {
  property: GardenProperty;
  manualBusy: boolean;
  onStart: (kind: TaskKind) => void;
  compact?: boolean;
}) {
  const recommended = recommendedTask(property);

  return (
    <div className="flex gap-2.5">
      {KINDS.map((kind) => {
        const automatic = isAutomated(property, kind);
        const active = property.task?.kind === kind;
        const disabled =
          Boolean(property.task) || (!automatic && manualBusy) || (property.condition <= 0 && kind !== 'maintain');
        const on = kind === recommended && !disabled;
        const duration = formatDuration(taskDuration(property, kind) * 1_000);
        const meta =
          kind === 'mow'
            ? `+${formatMoney(mowingPayout(property))} · ${duration}`
            : kind === 'maintain'
              ? `−${formatMoney(maintenanceCost(property))} · ${duration}`
              : duration;

        return (
          <button
            key={kind}
            type="button"
            className={`flex flex-1 items-center justify-center rounded-[9px] border transition-colors ${
              compact ? 'min-h-11 px-1 text-[12.5px] font-semibold' : 'min-h-14 flex-col gap-1 px-1.5 py-2.5'
            }`}
            style={{
              background: on ? 'var(--primary)' : 'var(--paper)',
              color: on ? 'var(--paper)' : disabled ? '#a8ac9d' : 'var(--primary)',
              borderColor: on ? 'var(--primary)' : disabled ? 'rgba(36,41,31,.12)' : 'rgba(63,107,40,.35)',
              cursor: disabled ? 'default' : 'pointer',
            }}
            disabled={disabled}
            onClick={() => onStart(kind)}
          >
            <span className={compact ? 'whitespace-nowrap' : 'text-[13px] font-semibold leading-none'}>
              {compact && active && property.task
                ? formatDuration(property.task.endsAt - Date.now())
                : ACTION_LABELS[kind]}
            </span>
            {!compact && (
              <span
                className="whitespace-nowrap font-mono text-[9.5px] font-medium leading-none"
                style={{ color: on ? 'rgba(255,253,247,.82)' : disabled ? '#b9bcae' : 'var(--ink-mute)' }}
              >
                {active && property.task ? formatDuration(property.task.endsAt - Date.now()) : meta}
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
      {/* Mobil: kompakte Zeilen (Entwurf 3a) */}
      <div className="flex flex-col gap-3 sm:hidden">
        {steps.map(({ kind, step, isInstall, price, affordable, installed }) => (
          <div key={kind} className="flex items-center gap-2.5">
            <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
              <span className="truncate text-[12.5px] font-semibold leading-tight text-ink">
                {step ? step.name : installed.name}
              </span>
              <span className="truncate text-[10.5px] leading-tight text-ink-mute">
                {TASK_LABELS[kind]} · {step ? step.description : 'Vollständig ausgebaut'}
              </span>
            </div>
            {step && (
              <button
                type="button"
                className="flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-[9px] border bg-surface px-[13px] font-mono text-[11.5px] font-semibold leading-none disabled:cursor-default"
                style={{
                  borderColor: affordable ? 'rgba(63,107,40,.3)' : 'rgba(36,41,31,.12)',
                  color: affordable ? 'var(--primary)' : '#a8ac9d',
                }}
                disabled={!affordable}
                onClick={() => (isInstall ? onInstall(kind) : onUnlock(kind))}
              >
                {formatMoney(price)}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Desktop: drei Karten (Entwurf 3b) */}
      <div className="hidden gap-3 sm:grid sm:grid-cols-3">
        {steps.map(({ kind, step, isInstall, price, affordable, installed }) => (
          <div key={kind} className="flex min-w-0 flex-col gap-2 rounded-[9px] border border-border bg-surface p-3.5">
            <span className="rr-label text-[9px] font-medium leading-none tracking-[0.12em]">
              {TASK_LABELS[kind]}
            </span>
            {step ? (
              <>
                <span className="text-[13px] font-semibold leading-tight text-ink">{step.name}</span>
                <span className="text-[11px] leading-snug text-ink-mute">{step.description}</span>
                {!isInstall && game.reputation < step.reputation && (
                  <span className="flex items-center gap-1.5 font-mono text-[10px] leading-none text-ink-mute">
                    <LockKeyhole className="size-3" aria-hidden="true" /> Reputation {step.reputation}
                  </span>
                )}
                <button
                  type="button"
                  className="mt-auto flex items-center justify-center rounded-[7px] border bg-paper px-3 py-2.5 font-mono text-[11px] font-semibold leading-none transition-colors disabled:cursor-default"
                  style={{
                    borderColor: affordable ? 'rgba(63,107,40,.35)' : 'rgba(36,41,31,.12)',
                    color: affordable ? 'var(--primary)' : '#a8ac9d',
                  }}
                  disabled={!affordable}
                  onClick={() => (isInstall ? onInstall(kind) : onUnlock(kind))}
                >
                  {isInstall ? 'Anschaffen' : 'Forschen'} · {formatMoney(price)}
                </button>
              </>
            ) : (
              <>
                <span className="text-[13px] font-semibold leading-tight text-ink">{installed.name}</span>
                <span className="flex items-center gap-1.5 text-[11px] leading-snug text-ink-mute">
                  <Check className="size-3.5 text-primary" aria-hidden="true" /> Vollständig ausgebaut
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
  onUnlock,
  onInstall,
}: {
  game: GameState;
  property: GardenProperty;
  manualBusy: boolean;
  onStart: (kind: TaskKind) => void;
  onUnlock: (kind: TaskKind) => void;
  onInstall: (kind: TaskKind) => void;
}) {
  const task = property.task;
  const progress = task
    ? Math.min(100, Math.max(0, ((Date.now() - task.startedAt) / (task.endsAt - task.startedAt)) * 100))
    : 0;

  return (
    <section
      className="flex min-w-0 flex-1 flex-col gap-4 overflow-y-auto p-4 lg:overflow-hidden lg:p-[22px_26px]"
      aria-label={property.name}
    >
      <DetailHeader property={property} />

      {property.rescueUntil && (
        <div
          className="flex shrink-0 items-center gap-3 rounded-xl border p-3.5"
          style={{ background: '#f6e3dd', borderColor: 'rgba(176,69,47,.35)' }}
        >
          <CircleAlert className="size-5 shrink-0" style={{ color: 'var(--tone-bad)' }} aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink">Vertrag akut gefährdet</p>
            <p className="text-xs text-ink-soft">
              Stelle die Zufriedenheit in den nächsten {formatDuration(property.rescueUntil - Date.now())} wieder her.
            </p>
          </div>
        </div>
      )}

      <div className="flex shrink-0 flex-col gap-3.5 rounded-xl border border-border bg-paper p-4 sm:p-5 lg:shrink lg:overflow-y-auto">
        <div className="flex flex-col gap-3.5">
          <SectionLabel>Werte</SectionLabel>
          {/* Mobil Balken, ab Desktop Ringe — so wie 3a gegenüber 3b */}
          <div className="flex flex-col gap-[9px] lg:hidden">
            {KINDS.map((kind) => (
              <Gauge key={kind} kind={kind} value={propertyMetricPercent(property, kind)} variant="bar" />
            ))}
          </div>
          <div className="hidden items-start gap-1.5 lg:flex">
            {KINDS.map((kind) => (
              <div key={kind} className="flex flex-1 justify-center">
                <Gauge kind={kind} value={propertyMetricPercent(property, kind)} variant="ring" />
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2.5 border-t border-border/60 pt-4">
          <SectionLabel trailing={payoutHint(property)}>Aktion</SectionLabel>
          {task && (
            <div className="flex items-center gap-3">
              <span className="relative h-1.5 flex-1 overflow-hidden rounded-sm bg-track">
                <span
                  className="absolute inset-y-0 left-0 rounded-sm bg-primary transition-[width] duration-1000"
                  style={{ width: `${progress}%` }}
                />
              </span>
              <span className="font-mono text-[11px] font-semibold leading-none text-ink-soft tabular-nums">
                {ACTION_LABELS[task.kind]} · {formatDuration(task.endsAt - Date.now())}
              </span>
            </div>
          )}
          <ActionButtons property={property} manualBusy={manualBusy} onStart={onStart} />
        </div>

        <div className="flex flex-col gap-2.5 border-t border-border/60 pt-4">
          <SectionLabel>Upgrades · nächster Schritt</SectionLabel>
          <UpgradeShelf game={game} property={property} onUnlock={onUnlock} onInstall={onInstall} />
        </div>
      </div>
    </section>
  );
}

/** Mobile Übersicht aus Entwurf 2a: Kartenstapel, jede Karte führt in die Detailseite. */
function MobileOverview({
  properties,
  manualBusy,
  filter,
  onFilter,
  onOpen,
  onStart,
}: {
  properties: GardenProperty[];
  manualBusy: boolean;
  filter: FilterId;
  onFilter: (id: FilterId) => void;
  onOpen: (id: string) => void;
  onStart: (id: string, kind: TaskKind) => void;
}) {
  const match = FILTERS.find((entry) => entry.id === filter)?.match ?? (() => true);
  const visible = properties.filter(match);

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:hidden">
      <FilterChips properties={properties} active={filter} onChange={onFilter} />
      <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-4 pb-4 pt-0.5">
        {visible.length === 0 ? (
          <div className="grid flex-1 place-items-center rounded-xl border border-dashed border-border bg-paper p-8 text-center">
            <p className="text-[12.5px] text-ink-soft">Kein Grundstück passt zu diesem Filter.</p>
          </div>
        ) : (
          visible.map((property) => (
            <div
              key={property.id}
              className="flex flex-col gap-2.5 rounded-[11px] border border-border bg-paper p-3.5"
            >
              <button
                type="button"
                className="flex flex-col gap-2.5 text-left"
                onClick={() => onOpen(property.id)}
                aria-label={`${property.name} öffnen`}
              >
                <span className="flex items-start justify-between gap-2">
                  <span className="flex min-w-0 flex-col gap-1.5">
                    <span className="truncate text-[14.5px] font-semibold leading-tight text-ink">
                      {property.name}
                    </span>
                    <span className="flex flex-wrap items-center gap-[7px]">
                      <StatusChip property={property} />
                      <span className="font-mono text-[10px] font-medium leading-none text-ink-mute">
                        {property.size.toLocaleString('de-DE')} m² · {property.type}
                      </span>
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <span
                      className="font-mono text-[13px] font-semibold leading-none tabular-nums"
                      style={{ color: satisfactionColor(property.satisfaction) }}
                    >
                      {Math.round(property.satisfaction)} %
                    </span>
                    <span className="rr-label text-[8px] leading-none tracking-[0.12em]">Zufrieden</span>
                  </span>
                </span>
                <span className="flex flex-col gap-[9px]">
                  {KINDS.map((kind) => (
                    <Gauge key={kind} kind={kind} value={propertyMetricPercent(property, kind)} variant="bar" />
                  ))}
                </span>
              </button>
              <div className="flex flex-col gap-2.5 border-t border-border/50 pt-2.5">
                <span className="rr-label text-[9px] font-medium leading-tight tracking-[0.08em] normal-case">
                  {payoutHint(property)}
                </span>
                <ActionButtons
                  property={property}
                  manualBusy={manualBusy}
                  onStart={(kind) => onStart(property.id, kind)}
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
    <section className="mx-auto w-full max-w-6xl space-y-5 p-4 lg:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <span className="rr-label text-[9.5px] leading-none">Neue Stammkunden</span>
          <h2 className="text-[27px] font-bold leading-tight text-ink">Vertragsangebote</h2>
        </div>
        <span className="flex items-center gap-2 rounded-lg border border-border bg-paper px-3 py-2 font-mono text-[10.5px] font-medium leading-none text-ink-soft">
          <Timer className="size-3.5" aria-hidden="true" /> Nächste Prüfung in {formatDuration(wait)}
        </span>
      </div>

      {game.offers.length === 0 ? (
        <div className="grid min-h-64 place-items-center rounded-xl border border-dashed border-border bg-paper p-10 text-center">
          <div className="max-w-md">
            <span className="mx-auto mb-4 grid size-12 place-items-center rounded-xl bg-secondary text-primary">
              <BriefcaseBusiness />
            </span>
            <h3 className="text-lg font-semibold text-ink">Noch keine passenden Anfragen</h3>
            <p className="mt-2 text-[12.5px] text-ink-soft">
              Pflege deine aktuellen Grundstücke weiter. Mit Reputation 2 werden erste Angebote
              freigeschaltet.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {game.offers.map((offer) => (
            <div key={offer.id} className="flex flex-col gap-3.5 rounded-xl border border-border bg-paper p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="text-[17px] font-bold leading-tight text-ink">{offer.name}</span>
                  <span className="text-[11.5px] text-ink-mute">{offer.subtitle}</span>
                </div>
                <span
                  className="shrink-0 whitespace-nowrap rounded-[5px] px-2 py-1 font-mono text-[9px] font-semibold uppercase leading-none tracking-[0.08em]"
                  style={{ background: '#eceadf', color: 'var(--ink-soft)' }}
                >
                  {offer.type}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-surface p-3">
                  <span className="rr-label text-[9px] leading-none">Fläche</span>
                  <p className="mt-1.5 font-mono text-sm font-semibold text-ink tabular-nums">
                    {offer.size.toLocaleString('de-DE')} m²
                  </p>
                </div>
                <div className="rounded-lg bg-surface p-3">
                  <span className="rr-label text-[9px] leading-none">Optimal</span>
                  <p className="mt-1.5 font-mono text-sm font-semibold text-ink tabular-nums">
                    {formatMoney(offer.payout * 1.2)}
                  </p>
                </div>
              </div>
              <dl className="flex flex-col gap-1.5 text-[11.5px] text-ink-mute">
                <div className="flex justify-between gap-2">
                  <dt>Wachstum</dt>
                  <dd className="font-semibold text-ink">
                    {offer.growthFactor > 1.1 ? 'Schnell' : offer.growthFactor < 0.98 ? 'Ruhig' : 'Normal'}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>Boden</dt>
                  <dd className="font-semibold text-ink">
                    {offer.drainage > 1.1
                      ? 'Trocknet schnell'
                      : offer.drainage < 0.95
                        ? 'Speichert Wasser'
                        : 'Ausgeglichen'}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>Anspruch</dt>
                  <dd className="font-semibold text-ink">
                    {offer.customerDemand > 1.2 ? 'Hoch' : 'Normal'}
                  </dd>
                </div>
              </dl>
              <div className="mt-auto flex gap-2 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => onDecline(offer.id)}>
                  Ablehnen
                </Button>
                <Button className="flex-1" onClick={() => onAccept(offer.id)}>
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
    <section className="mx-auto w-full max-w-6xl space-y-5 p-4 lg:p-6">
      <div className="flex flex-col gap-1.5">
        <span className="rr-label text-[9.5px] leading-none">Wissen freischalten, vor Ort investieren</span>
        <h2 className="text-[27px] font-bold leading-tight text-ink">Technik &amp; Pflege</h2>
        <p className="text-[12.5px] text-ink-soft">
          Ausgewähltes Grundstück: <strong className="font-semibold text-ink">{selected.name}</strong>
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
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
            <div key={kind} className="flex flex-col gap-3.5 rounded-xl border border-border bg-paper p-5">
              <div className="flex flex-col gap-1">
                <span className="rr-label text-[9.5px] leading-none">{TASK_LABELS[kind]}</span>
                <span className="text-[17px] font-bold leading-tight text-ink">{current.name}</span>
                <span className="font-mono text-[10px] font-medium leading-none text-ink-mute">
                  vor Ort installiert
                </span>
              </div>

              {nextInstall ? (
                <div
                  className="flex flex-col gap-2 rounded-[9px] border p-3.5"
                  style={{ background: '#eef2e6', borderColor: 'rgba(79,122,47,.28)' }}
                >
                  <span className="rr-label text-[9px] leading-none">Anschaffen</span>
                  <span className="text-[13px] font-semibold leading-tight text-ink">{nextInstall.name}</span>
                  <span className="text-[11px] leading-snug text-ink-mute">{nextInstall.description}</span>
                  <Button
                    className="mt-1 w-full"
                    disabled={game.money < nextInstall.installCost}
                    onClick={() => onInstall(kind)}
                  >
                    Für {formatMoney(nextInstall.installCost)} installieren
                  </Button>
                </div>
              ) : nextUnlock ? (
                <div className="flex flex-col gap-2 rounded-[9px] border border-border bg-surface p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="rr-label text-[9px] leading-none">Nächste Forschung</span>
                    {game.reputation < nextUnlock.reputation && (
                      <LockKeyhole className="size-3.5 text-ink-mute" aria-hidden="true" />
                    )}
                  </div>
                  <span className="text-[13px] font-semibold leading-tight text-ink">{nextUnlock.name}</span>
                  <span className="text-[11px] leading-snug text-ink-mute">{nextUnlock.description}</span>
                  <span className="font-mono text-[10px] font-medium leading-none text-ink-soft">
                    Benötigt Reputation {nextUnlock.reputation}
                  </span>
                  <Button
                    variant="outline"
                    className="mt-1 w-full"
                    disabled={!canResearch}
                    onClick={() => onUnlock(kind)}
                  >
                    Für {formatMoney(nextUnlock.unlockCost)} freischalten
                  </Button>
                </div>
              ) : (
                <div className="flex min-h-28 flex-col items-center justify-center gap-1.5 rounded-[9px] bg-surface p-4 text-center">
                  <Check className="size-5 text-primary" aria-hidden="true" />
                  <span className="text-[13px] font-semibold text-ink">Vollständig ausgebaut</span>
                  <span className="text-[11px] text-ink-mute">Die beste Technik ist installiert.</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-border bg-paper p-5">
        <div className="flex flex-col gap-1">
          <span className="flex items-center gap-2 text-[17px] font-bold leading-tight text-ink">
            <FlaskConical className="size-4.5 text-primary" aria-hidden="true" /> Rasenpflege
          </span>
          <span className="text-[12.5px] text-ink-soft">
            Optionale Behandlungen mit klaren Vor- und Nachteilen.
          </span>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
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
              <div key={item.id} className="flex flex-col gap-2 rounded-[9px] border border-border bg-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-[13px] font-semibold leading-tight text-ink">{item.name}</span>
                  {installed && (
                    <span
                      className="shrink-0 rounded-[5px] px-2 py-1 font-mono text-[9px] font-semibold uppercase leading-none tracking-[0.08em]"
                      style={{ background: '#e8efdf', color: 'var(--tone-ok)' }}
                    >
                      Aktiv
                    </span>
                  )}
                </div>
                <span className="text-[11px] leading-snug text-ink-mute">{item.description}</span>
                {!unlocked ? (
                  <Button
                    variant="outline"
                    className="mt-auto w-full"
                    disabled={game.reputation < item.rep || game.money < item.unlock}
                    onClick={() => onUnlockChemistry(item.id)}
                  >
                    Freischalten · {formatMoney(item.unlock)} · Rep. {item.rep}
                  </Button>
                ) : !installed ? (
                  <Button
                    className="mt-auto w-full"
                    disabled={game.money < item.install}
                    onClick={() => onInstallChemistry(item.id)}
                  >
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
    notice,
    offlineSummary,
    dismissOfflineSummary,
    startTask,
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
      <main className="grid min-h-screen place-items-center bg-surface">
        <div className="text-center">
          <span className="mx-auto mb-3 block size-10 animate-pulse rounded-lg" style={{ background: LOGO_STRIPES }} />
          <p className="text-sm font-medium text-ink-soft">Der Betrieb wird vorbereitet…</p>
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
    <main className="flex h-[100dvh] flex-col overflow-hidden bg-surface text-ink">
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
        onBack={view === 'overview' && mobileDetail ? () => setMobileDetail(false) : undefined}
      />

      {game.activeEvent && (
        <div className="shrink-0 border-b" style={{ background: '#f6ead6', borderColor: 'rgba(192,134,58,.35)' }}>
          <div className="mx-auto flex max-w-[1540px] items-center gap-3 px-4 py-2 lg:px-5">
            <BellRing className="size-4 shrink-0" style={{ color: 'var(--tone-warn)' }} aria-hidden="true" />
            <p className="min-w-0 flex-1 truncate text-[12.5px] text-ink">
              <strong className="font-semibold">{game.activeEvent.title}:</strong> {game.activeEvent.description}
            </p>
            <Button variant="outline" size="xs" className="shrink-0 bg-paper" onClick={resolveEvent}>
              {game.activeEvent.actionLabel ?? 'Verstanden'}
            </Button>
          </div>
        </div>
      )}

      {view === 'overview' && !mobileDetail && activeProperty && (
        <BusyBanner property={activeProperty} onOpen={jumpToActive} />
      )}

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <SideNav
          view={view}
          setView={setView}
          settingsOpen={settingsOpen}
          onSettings={() => setSettingsOpen(true)}
        />
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {view === 'overview' && (
          <>
            {/* Desktop: Liste links, Detail rechts (Entwurf 3b) */}
            <div className="hidden min-h-0 flex-1 lg:flex">
              <PropertyList properties={game.properties} selectedId={selected.id} onSelect={setSelectedId} />
              <PropertyDetail
                game={game}
                property={selected}
                manualBusy={manualBusy}
                onStart={(kind) => startTask(selected.id, kind)}
                onUnlock={unlockEquipment}
                onInstall={(kind) => installEquipment(selected.id, kind)}
              />
            </div>

            {/* Mobil: Übersicht 2a, per Tippen auf eine Kachel zur Detailseite 3a */}
            {mobileDetail ? (
              <div className="flex min-h-0 flex-1 flex-col lg:hidden">
                <PropertyRail properties={game.properties} selectedId={selected.id} onSelect={setSelectedId} />
                <PropertyDetail
                  game={game}
                  property={selected}
                  manualBusy={manualBusy}
                  onStart={(kind) => startTask(selected.id, kind)}
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
              />
            )}
          </>
        )}
        {view === 'offers' && (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <OffersView
              game={game}
              onAccept={(id) => {
                acceptOffer(id);
                setView('overview');
              }}
              onDecline={declineOffer}
            />
          </div>
        )}
        {view === 'upgrades' && (
          <div className="min-h-0 flex-1 overflow-y-auto">
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

      {notice && (
        <output
          aria-live="polite"
          className="fixed bottom-24 left-1/2 z-50 flex w-[min(440px,calc(100%-2rem))] -translate-x-1/2 items-center gap-2 rounded-xl px-4 py-3 text-sm shadow-xl lg:bottom-4"
          style={{ background: 'var(--ink)', color: 'var(--paper)' }}
        >
          <Sparkles className="size-4 shrink-0" aria-hidden="true" /> {notice}
        </output>
      )}

      {offlineSummary && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/25 p-4" role="presentation">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="offline-title"
            className="w-full max-w-md rounded-xl border border-border bg-paper p-5 shadow-2xl"
          >
            <span className="mb-4 block size-10 rounded-lg" style={{ background: LOGO_STRIPES }} aria-hidden="true" />
            <h2 id="offline-title" className="text-[22px] font-bold leading-tight text-ink">
              Willkommen zurück
            </h2>
            <p className="mt-1 text-[12.5px] text-ink-soft">
              Dein Betrieb lief {humanOfflineDuration(offlineSummary.elapsedMs)} ohne dich weiter.
            </p>
            <div className="my-5 grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-surface p-3 text-center">
                <Banknote className="mx-auto mb-1 size-4 text-primary" aria-hidden="true" />
                <strong className="block font-mono text-sm text-ink tabular-nums">
                  {formatMoney(offlineSummary.earned)}
                </strong>
                <span className="rr-label text-[8px] leading-none">verdient</span>
              </div>
              <div className="rounded-lg bg-surface p-3 text-center">
                <Check className="mx-auto mb-1 size-4 text-primary" aria-hidden="true" />
                <strong className="block font-mono text-sm text-ink tabular-nums">{offlineSummary.completed}</strong>
                <span className="rr-label text-[8px] leading-none">erledigt</span>
              </div>
              <div className="rounded-lg bg-surface p-3 text-center">
                <CircleAlert className="mx-auto mb-1 size-4" style={{ color: 'var(--tone-warn)' }} aria-hidden="true" />
                <strong className="block font-mono text-sm text-ink tabular-nums">{offlineSummary.critical}</strong>
                <span className="rr-label text-[8px] leading-none">kritisch</span>
              </div>
            </div>
            <Button className="w-full" autoFocus onClick={dismissOfflineSummary}>
              Betrieb prüfen
            </Button>
          </section>
        </div>
      )}

      {settingsOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/25 p-4"
          onMouseDown={() => setSettingsOpen(false)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-title"
            className="w-full max-w-sm rounded-xl border border-border bg-paper p-5 shadow-2xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="settings-title" className="text-[17px] font-bold leading-tight text-ink">
                  Einstellungen
                </h2>
                <p className="mt-1 text-[12.5px] text-ink-soft">
                  Der Spielstand wird automatisch in diesem Browser gespeichert.
                </p>
              </div>
              <Button variant="ghost" size="icon-sm" aria-label="Schließen" onClick={() => setSettingsOpen(false)}>
                <X />
              </Button>
            </div>
            <div
              className="mt-5 rounded-[9px] border p-3.5"
              style={{ background: '#f6e3dd', borderColor: 'rgba(176,69,47,.3)' }}
            >
              <p className="text-[13px] font-semibold text-ink">Betrieb neu starten</p>
              <p className="mt-1 text-[11px] text-ink-soft">
                Entfernt Geld, Verträge und alle freigeschalteten Upgrades.
              </p>
              <Button
                variant="destructive"
                className="mt-3"
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
