'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Banknote,
  BellRing,
  BriefcaseBusiness,
  Check,
  ChevronRight,
  CircleAlert,
  CloudRain,
  CloudSun,
  Droplets,
  FlaskConical,
  Leaf,
  LayoutDashboard,
  LockKeyhole,
  MapPin,
  RotateCcw,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Sprout,
  Timer,
  TrendingUp,
  Wrench,
  X,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useGame } from '@/hooks/use-game';
import {
  conditionHint,
  EQUIPMENT,
  formatDuration,
  formatMoney,
  GardenProperty,
  grassHint,
  humanOfflineDuration,
  isAutomated,
  maintenanceCost,
  moistureHint,
  mowingPayout,
  propertyStatus,
  TASK_LABELS,
  taskBlocksPlayer,
  taskDuration,
  TaskKind,
  ViewName,
} from '@/lib/game';

const taskIcons = { mow: Sprout, water: Droplets, maintain: Wrench };
type GaugeTone = 'green' | 'blue' | 'amber' | 'rose';

function statusBadge(property: GardenProperty) {
  const status = propertyStatus(property);
  const classes = {
    danger: 'bg-red-100 text-red-800',
    warning: 'bg-amber-100 text-amber-800',
    info: 'bg-sky-100 text-sky-800',
    good: 'bg-emerald-100 text-emerald-800',
    neutral: 'bg-stone-100 text-stone-700',
  };
  return <Badge className={classes[status.tone]}>{status.label}</Badge>;
}

function metricTone(kind: TaskKind, value: number): GaugeTone {
  if (kind === 'mow') return value >= 60 && value <= 80 ? 'green' : value > 100 ? 'rose' : 'amber';
  if (kind === 'water') return value >= 30 && value <= 85 ? 'blue' : value > 100 ? 'rose' : 'amber';
  return value >= 70 ? 'green' : value < 40 ? 'rose' : 'amber';
}

function satisfactionClass(value: number) {
  if (value >= 75) return 'text-emerald-700';
  if (value >= 40) return 'text-amber-700';
  return 'text-rose-700';
}

function GaugeRing({
  value,
  max = 100,
  tone,
  size = 'large',
}: {
  value: number;
  max?: number;
  tone: GaugeTone;
  size?: 'small' | 'large';
}) {
  const stroke = {
    green: 'stroke-emerald-600',
    blue: 'stroke-sky-500',
    amber: 'stroke-amber-500',
    rose: 'stroke-rose-500',
  }[tone];
  const dimension = size === 'small' ? 'size-9' : 'size-20';
  const textSize = size === 'small' ? 'text-[9px]' : 'text-base';
  const percent = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <span
      className={`relative grid shrink-0 place-items-center ${dimension}`}
      role="meter"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.round(value)}
    >
      <svg viewBox="0 0 44 44" className="absolute inset-0 size-full -rotate-90" aria-hidden="true">
        <circle cx="22" cy="22" r="18" fill="none" strokeWidth="4" className="stroke-muted" />
        <circle
          cx="22"
          cy="22"
          r="18"
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
          pathLength="100"
          strokeDasharray={`${percent} 100`}
          className={`${stroke} transition-all duration-500`}
        />
      </svg>
      <strong className={`relative tabular-nums ${textSize}`}>{Math.round(value)}</strong>
    </span>
  );
}

function propertyWarnings(property: GardenProperty, unlocked: Record<TaskKind, number>) {
  const warnings: Array<{ label: string; icon: typeof CircleAlert; tone: string }> = [];
  if ((['mow', 'water', 'maintain'] as TaskKind[]).some((kind) => property.equipment[kind] < unlocked[kind])) {
    warnings.push({ label: 'Equipment-Upgrade verfügbar', icon: TrendingUp, tone: 'text-emerald-700 bg-emerald-100' });
  }
  if (property.rescueUntil) warnings.push({ label: 'Vertrag akut gefährdet', icon: CircleAlert, tone: 'text-rose-700 bg-rose-100' });
  if (property.grass > 80) warnings.push({ label: 'Rasen außerhalb des optimalen Fensters', icon: Sprout, tone: 'text-amber-700 bg-amber-100' });
  if (property.moisture < 30 || property.moisture > 85) warnings.push({ label: 'Feuchtigkeit außerhalb des optimalen Bereichs', icon: Droplets, tone: 'text-sky-700 bg-sky-100' });
  if (property.condition < 40) warnings.push({ label: 'Gerätewartung erforderlich', icon: Wrench, tone: 'text-rose-700 bg-rose-100' });
  if (property.task) warnings.push({ label: `${TASK_LABELS[property.task.kind]} läuft`, icon: Timer, tone: 'text-primary bg-secondary' });
  return warnings;
}

function AppHeader({
  view,
  setView,
  money,
  reputation,
  weather,
  manualBusy,
  onSettings,
}: {
  view: ViewName;
  setView: (view: ViewName) => void;
  money: number;
  reputation: number;
  weather: 'mild' | 'heat' | 'rain';
  manualBusy: boolean;
  onSettings: () => void;
}) {
  const nav = [
    { id: 'overview' as const, label: 'Betrieb', icon: LayoutDashboard },
    { id: 'offers' as const, label: 'Angebote', icon: BriefcaseBusiness },
    { id: 'upgrades' as const, label: 'Technik', icon: ShoppingBag },
  ];
  const weatherLabel = weather === 'heat' ? 'Hitzewelle' : weather === 'rain' ? 'Regenschauer' : 'Mildes Wetter';
  const WeatherIcon = weather === 'rain' ? CloudRain : CloudSun;

  return (
    <header className="shrink-0 border-b border-border/80 bg-card/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1540px] items-center gap-3 px-3 py-2.5 sm:px-5 lg:px-7">
        <button
          className="flex min-w-0 items-center gap-2.5 rounded-lg text-left focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          onClick={() => setView('overview')}
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Leaf className="size-4.5" aria-hidden="true" />
          </span>
          <span className="hidden sm:block">
            <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Gartenbetrieb
            </span>
            <span className="block text-base font-semibold leading-tight tracking-tight">Garden Grinder</span>
          </span>
        </button>

        <nav className="ml-1 flex flex-1 items-center justify-center gap-1" aria-label="Hauptnavigation">
          {nav.map(({ id, label, icon: Icon }) => (
            <Button
              key={id}
              variant={view === id ? 'secondary' : 'ghost'}
              size="sm"
              className="h-9 px-2.5 sm:px-3"
              onClick={() => setView(id)}
              aria-current={view === id ? 'page' : undefined}
            >
              <Icon />
              <span className="hidden md:inline">{label}</span>
            </Button>
          ))}
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-3">
          <div className="hidden items-center gap-2 rounded-lg border border-border bg-muted/50 px-2.5 py-1.5 xl:flex">
            <WeatherIcon className="size-4 text-primary" aria-hidden="true" />
            <span className="text-xs font-medium">{weatherLabel}</span>
          </div>
          <div className="rounded-lg bg-primary px-2.5 py-1.5 text-primary-foreground sm:min-w-28">
            <span className="hidden text-[10px] text-primary-foreground/70 sm:block">Vermögen</span>
            <span className="block text-sm font-semibold tabular-nums">{formatMoney(money)}</span>
          </div>
          <div
            className={`flex h-9 items-center gap-1.5 rounded-lg border px-2 text-[10px] font-semibold sm:px-2.5 sm:text-xs ${
              manualBusy
                ? 'border-amber-200 bg-amber-50 text-amber-800'
                : 'border-emerald-200 bg-emerald-50 text-emerald-800'
            }`}
          >
            <span className={`size-1.5 rounded-full ${manualBusy ? 'bg-amber-500' : 'bg-emerald-500'}`} />
            {manualBusy ? 'Beschäftigt' : 'Verfügbar'}
          </div>
          <Badge variant="secondary" className="hidden h-9 gap-1.5 px-3 sm:inline-flex">
            <ShieldCheck className="size-3.5" /> {Math.floor(reputation)}
          </Badge>
          <Button variant="outline" size="icon" aria-label="Einstellungen" onClick={onSettings}>
            <Settings2 />
          </Button>
        </div>
      </div>
    </header>
  );
}

function PropertyRail({
  properties,
  unlocked,
  selectedId,
  onSelect,
}: {
  properties: GardenProperty[];
  unlocked: Record<TaskKind, number>;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <aside className="min-w-0 rounded-xl border border-border bg-card shadow-sm lg:h-full lg:overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-3.5 py-3">
        <div>
          <p className="text-sm font-semibold">Grundstücke</p>
          <p className="text-xs text-muted-foreground">{properties.length} aktive Verträge</p>
        </div>
        <MapPin className="size-4 text-muted-foreground" aria-hidden="true" />
      </div>
      <div className="w-full lg:h-[calc(100%-61px)] lg:overflow-y-auto">
        <div className="flex flex-col gap-2 p-2">
          {properties.map((property) => {
            const selected = property.id === selectedId;
            const warnings = propertyWarnings(property, unlocked);
            const miniGauges = [
              { kind: 'mow' as const, label: 'Gras', value: property.grass, max: 150, icon: Sprout },
              { kind: 'water' as const, label: 'Feuchte', value: property.moisture, max: 150, icon: Droplets },
              { kind: 'maintain' as const, label: 'Geräte', value: property.condition, max: 100, icon: Wrench },
            ];
            return (
              <button
                key={property.id}
                className={`w-full rounded-lg border p-3 text-left transition-colors ${
                  selected
                    ? 'border-primary/30 bg-secondary shadow-sm'
                    : 'border-transparent hover:border-border hover:bg-muted/60'
                }`}
                onClick={() => onSelect(property.id)}
              >
                <span className="flex items-start justify-between gap-2">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{property.name}</span>
                    <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                      {property.size.toLocaleString('de-DE')} m² · {property.type}
                    </span>
                  </span>
                  {warnings.length > 0 && (
                    <span className="flex shrink-0 items-center gap-1">
                      {warnings.slice(0, 3).map(({ label, icon: WarningIcon, tone }) => (
                        <span
                          key={label}
                          className={`grid size-6 place-items-center rounded-md ${tone}`}
                          title={label}
                          aria-label={label}
                        >
                          <WarningIcon className="size-3.5" aria-hidden="true" />
                        </span>
                      ))}
                    </span>
                  )}
                </span>
                <span className="mt-2 flex justify-end border-t border-border/70 pt-2">
                  <span className={`text-sm font-bold tabular-nums ${satisfactionClass(property.satisfaction)}`}>
                    {Math.round(property.satisfaction)} %
                  </span>
                </span>
                <span className="mt-2 grid grid-cols-3 gap-1.5" aria-label="Grundstückswerte">
                  {miniGauges.map(({ kind, label, value, max, icon: Icon }) => (
                    <span
                      key={kind}
                      className="flex items-center justify-center gap-1.5 rounded-md bg-card/75 px-1.5 py-1.5"
                      title={`${label}: ${Math.round(value)}`}
                      aria-label={`${label}: ${Math.round(value)}`}
                    >
                      <Icon className="size-3.5 text-muted-foreground" aria-hidden="true" />
                      <GaugeRing value={value} max={max} tone={metricTone(kind, value)} size="small" />
                    </span>
                  ))}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

function StatActionCard({
  property,
  kind,
  manualBusy,
  onStart,
}: {
  property: GardenProperty;
  kind: TaskKind;
  manualBusy: boolean;
  onStart: () => void;
}) {
  const Icon = taskIcons[kind];
  const equipment = EQUIPMENT[kind][property.equipment[kind]];
  const active = property.task?.kind === kind;
  const duration = taskDuration(property, kind);
  const payout =
    kind === 'mow'
      ? active
        ? property.task?.payoutTotal ?? mowingPayout(property)
        : mowingPayout(property)
      : 0;
  const cost = kind === 'maintain' ? maintenanceCost(property) : 0;
  const automatic = isAutomated(property, kind);
  const handsFree = Boolean(equipment.handsFree);
  const blocked = Boolean(property.task) || (!automatic && manualBusy) || (property.condition <= 0 && kind !== 'maintain');
  const value = kind === 'mow' ? property.grass : kind === 'water' ? property.moisture : property.condition;
  const max = kind === 'maintain' ? 100 : 150;
  const hint = kind === 'mow' ? grassHint(value) : kind === 'water' ? moistureHint(value) : conditionHint(value);
  const taskProgress = active && property.task
    ? ((Date.now() - property.task.startedAt) / (property.task.endsAt - property.task.startedAt)) * 100
    : 0;

  return (
    <Card className={active ? 'ring-2 ring-primary/45' : ''}>
      <CardContent className="flex h-full flex-col gap-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="grid size-10 place-items-center rounded-xl bg-secondary text-primary">
              <Icon className="size-4.5" aria-hidden="true" />
            </span>
            <span>
              <span className="block font-semibold">{TASK_LABELS[kind]}</span>
              <span className="block text-[11px] text-muted-foreground">{equipment.name}</span>
            </span>
          </div>
          {(automatic || handsFree) && <Badge variant="secondary">{automatic ? 'Auto' : 'Autark'}</Badge>}
        </div>

        <div className="flex items-center gap-4 rounded-xl bg-muted/55 p-3">
          <GaugeRing value={value} max={max} tone={metricTone(kind, value)} />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {kind === 'mow' ? 'Grasschnitt' : kind === 'water' ? 'Feuchtigkeit' : 'Gerätezustand'}
            </p>
            <p className="mt-1 text-sm font-semibold">{hint}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {kind === 'mow' ? 'Optimal: 60–80' : kind === 'water' ? 'Optimal: 30–85' : 'Wartung empfohlen unter 40'}
            </p>
          </div>
        </div>

        {active && property.task && (
          <div className="rounded-lg bg-secondary/65 p-2.5">
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-semibold"><Timer className="size-3.5" /> Läuft</span>
              <span className="tabular-nums text-muted-foreground">{formatDuration(property.task.endsAt - Date.now())}</span>
            </div>
            <Progress value={taskProgress} className="[&_[data-slot=progress-track]]:h-1.5" />
          </div>
        )}

        <div className="mt-auto flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Timer className="size-3.5" /> {formatDuration(duration * 1_000)}</span>
          {kind === 'mow' && (
            <strong className="text-emerald-700">
              {active
                ? `+${formatMoney(property.task?.payoutAccrued ?? 0)} / ${formatMoney(payout)}`
                : `+${formatMoney(payout)}`}
            </strong>
          )}
          {kind === 'maintain' && <strong className="text-foreground">−{formatMoney(cost)}</strong>}
        </div>
        <Button
          variant={kind === 'mow' ? 'default' : 'outline'}
          className="w-full"
          disabled={blocked}
          onClick={onStart}
        >
          {active ? 'Läuft…' : automatic ? 'Jetzt auslösen' : 'Starten'}
          {!active && <ChevronRight data-icon="inline-end" />}
        </Button>
      </CardContent>
    </Card>
  );
}

function PropertyDetail({
  property,
  manualBusy,
  onStart,
}: {
  property: GardenProperty;
  manualBusy: boolean;
  onStart: (kind: TaskKind) => void;
}) {
  return (
    <section className="min-w-0 space-y-3 lg:h-full lg:overflow-y-auto lg:pr-1" aria-label={property.name}>
      <div className="relative min-h-44 overflow-hidden rounded-xl border border-border bg-card shadow-sm sm:min-h-52">
        <img
          src="/assets/garden-dashboard.png"
          alt="Illustrierter gepflegter Vorgarten mit Rasenmäher, Schlauch und Werkzeug"
          className="absolute inset-0 size-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#17311f]/90 via-[#17311f]/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-4 text-white sm:p-5">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              {statusBadge(property)}
              <span className="rounded-full border border-white/20 bg-black/25 px-2.5 py-1 text-xs backdrop-blur-sm">
                Reputation beim Kunden{' '}
                <strong className={property.satisfaction >= 75 ? 'text-emerald-200' : property.satisfaction >= 40 ? 'text-amber-200' : 'text-rose-200'}>
                  {Math.round(property.satisfaction)} %
                </strong>
              </span>
            </div>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{property.name}</h2>
            <p className="mt-1 text-sm text-white/75">
              {property.type} · {property.size.toLocaleString('de-DE')} m² · {property.subtitle}
            </p>
          </div>
          <div className="hidden rounded-xl border border-white/20 bg-black/20 px-4 py-3 text-right backdrop-blur-sm sm:block">
            <p className="text-[11px] uppercase tracking-[0.12em] text-white/65">Optimaler Ertrag</p>
            <p className="text-xl font-semibold">{formatMoney(property.payout * 1.2)}</p>
          </div>
        </div>
      </div>

      {property.rescueUntil && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-red-900">
          <CircleAlert className="size-5 shrink-0" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Vertrag akut gefährdet</p>
            <p className="text-xs text-red-700">Stelle die Zufriedenheit in den nächsten {formatDuration(property.rescueUntil - Date.now())} wieder her.</p>
          </div>
        </div>
      )}

      <div className="grid gap-2.5 md:grid-cols-3">
        {(['mow', 'water', 'maintain'] as TaskKind[]).map((kind) => (
          <StatActionCard
            key={kind}
            property={property}
            kind={kind}
            manualBusy={manualBusy}
            onStart={() => onStart(kind)}
          />
        ))}
      </div>
    </section>
  );
}

function OperationsPanel({
  property,
  unlocked,
  money,
  onInstall,
}: {
  property: GardenProperty;
  unlocked: Record<TaskKind, number>;
  money: number;
  onInstall: (kind: TaskKind) => void;
}) {
  return (
    <aside className="space-y-3 lg:h-full lg:overflow-y-auto lg:pr-1" aria-label="Betriebsdetails">
      <Card size="sm">
        <CardHeader>
          <CardTitle>Auf einen Blick</CardTitle>
          <CardDescription>Leistung dieses Vertrags</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-muted p-3">
            <p className="text-[11px] text-muted-foreground">Umsatz gesamt</p>
            <p className="mt-1 font-semibold tabular-nums">{formatMoney(property.lifetimeRevenue)}</p>
          </div>
          <div className="rounded-lg bg-muted p-3">
            <p className="text-[11px] text-muted-foreground">Mähvorgänge</p>
            <p className="mt-1 font-semibold tabular-nums">{property.completedJobs}</p>
          </div>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>Equipment vor Ort</CardTitle>
          <CardDescription>Technik für dieses Grundstück</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {(['mow', 'water', 'maintain'] as TaskKind[]).map((kind) => {
            const Icon = taskIcons[kind];
            const equipment = EQUIPMENT[kind][property.equipment[kind]];
            const nextLevel = property.equipment[kind] + 1;
            const upgrade = nextLevel <= unlocked[kind] ? EQUIPMENT[kind][nextLevel] : undefined;
            return (
              <div key={kind} className="rounded-lg border border-border p-2.5">
                <div className="flex items-center gap-2.5">
                  <span className="grid size-8 place-items-center rounded-lg bg-secondary text-primary"><Icon className="size-4" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs text-muted-foreground">{TASK_LABELS[kind]}</span>
                    <span className="block truncate text-sm font-medium">{equipment.name}</span>
                  </span>
                  {equipment.automated && <Badge variant="secondary">Auto</Badge>}
                </div>
                {upgrade && (
                  <Button
                    variant="outline"
                    size="xs"
                    className="mt-2.5 w-full justify-between"
                    disabled={money < upgrade.installCost}
                    onClick={() => onInstall(kind)}
                  >
                    <span className="truncate">Upgrade: {upgrade.name}</span>
                    <span>{formatMoney(upgrade.installCost)}</span>
                  </Button>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

    </aside>
  );
}

function MobilePropertySheet({
  open,
  property,
  manualBusy,
  unlocked,
  money,
  onClose,
  onStart,
  onInstall,
}: {
  open: boolean;
  property: GardenProperty;
  manualBusy: boolean;
  unlocked: Record<TaskKind, number>;
  money: number;
  onClose: () => void;
  onStart: (kind: TaskKind) => void;
  onInstall: (kind: TaskKind) => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 lg:hidden" role="presentation">
      <button
        className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
        aria-label="Grundstücksdetails schließen"
        onClick={onClose}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-label={`Details für ${property.name}`}
        className="absolute inset-x-0 bottom-0 max-h-[92dvh] animate-in overflow-y-auto rounded-t-3xl bg-background p-3 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl slide-in-from-bottom duration-200"
      >
        <div className="sticky top-0 z-10 mb-3 flex items-center justify-between rounded-2xl bg-background/95 px-1 py-1 backdrop-blur">
          <span className="ml-auto mr-auto h-1.5 w-12 rounded-full bg-border" />
          <Button variant="outline" size="icon-sm" aria-label="Schließen" onClick={onClose}>
            <X />
          </Button>
        </div>
        <div className="space-y-3">
          <PropertyDetail property={property} manualBusy={manualBusy} onStart={onStart} />
          <OperationsPanel
            property={property}
            unlocked={unlocked}
            money={money}
            onInstall={onInstall}
          />
        </div>
      </section>
    </div>
  );
}

function OffersView({ game, onAccept, onDecline }: { game: NonNullable<ReturnType<typeof useGame>['game']>; onAccept: (id: string) => void; onDecline: (id: string) => void }) {
  const wait = Math.max(0, game.nextOfferAt - Date.now());
  return (
    <section className="mx-auto w-full max-w-6xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-primary">Neue Stammkunden</p>
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Vertragsangebote</h2>
          <p className="mt-1 text-sm text-muted-foreground">Wachse in deinem Tempo. Es gibt kein künstliches Vertragslimit.</p>
        </div>
        <Badge variant="secondary" className="h-8 gap-1.5 px-3"><Timer /> Nächste Prüfung in {formatDuration(wait)}</Badge>
      </div>

      {game.offers.length === 0 ? (
        <Card className="min-h-72 items-center justify-center border-dashed text-center">
          <CardContent className="max-w-md py-12">
            <span className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-secondary text-primary"><BriefcaseBusiness /></span>
            <h3 className="text-lg font-semibold">Noch keine passenden Anfragen</h3>
            <p className="mt-2 text-sm text-muted-foreground">Pflege deine aktuellen Grundstücke weiter. Mit Reputation 2 werden erste Angebote freigeschaltet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {game.offers.map((offer) => (
            <Card key={offer.id}>
              <CardHeader>
                <CardTitle>{offer.name}</CardTitle>
                <CardDescription>{offer.subtitle}</CardDescription>
                <CardAction><Badge variant="secondary">{offer.type}</Badge></CardAction>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-muted p-3"><p className="text-xs text-muted-foreground">Fläche</p><p className="font-semibold">{offer.size.toLocaleString('de-DE')} m²</p></div>
                  <div className="rounded-lg bg-muted p-3"><p className="text-xs text-muted-foreground">Optimal</p><p className="font-semibold">{formatMoney(offer.payout * 1.2)}</p></div>
                </div>
                <div className="space-y-1.5 text-xs text-muted-foreground">
                  <p className="flex justify-between"><span>Wachstum</span><strong className="text-foreground">{offer.growthFactor > 1.1 ? 'Schnell' : offer.growthFactor < 0.98 ? 'Ruhig' : 'Normal'}</strong></p>
                  <p className="flex justify-between"><span>Boden</span><strong className="text-foreground">{offer.drainage > 1.1 ? 'Trocknet schnell' : offer.drainage < 0.95 ? 'Speichert Wasser' : 'Ausgeglichen'}</strong></p>
                  <p className="flex justify-between"><span>Anspruch</span><strong className="text-foreground">{offer.customerDemand > 1.2 ? 'Hoch' : 'Normal'}</strong></p>
                </div>
              </CardContent>
              <CardFooter className="gap-2">
                <Button variant="outline" className="flex-1" onClick={() => onDecline(offer.id)}>Ablehnen</Button>
                <Button className="flex-1" onClick={() => onAccept(offer.id)}>Annehmen</Button>
              </CardFooter>
            </Card>
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
  game: NonNullable<ReturnType<typeof useGame>['game']>;
  selected: GardenProperty;
  onUnlock: (kind: TaskKind) => void;
  onInstall: (kind: TaskKind) => void;
  onUnlockChemistry: (kind: 'fertilizer' | 'weedControl') => void;
  onInstallChemistry: (kind: 'fertilizer' | 'weedControl') => void;
}) {
  return (
    <section className="mx-auto w-full max-w-6xl space-y-5">
      <div>
        <p className="text-sm font-medium text-primary">Wissen freischalten, vor Ort investieren</p>
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Technik & Pflege</h2>
        <p className="mt-1 text-sm text-muted-foreground">Ausgewähltes Grundstück: <strong className="text-foreground">{selected.name}</strong></p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {(['mow', 'water', 'maintain'] as TaskKind[]).map((kind) => {
          const Icon = taskIcons[kind];
          const unlockedLevel = game.unlocked[kind];
          const installedLevel = selected.equipment[kind];
          const current = EQUIPMENT[kind][installedLevel];
          const nextUnlock = EQUIPMENT[kind][unlockedLevel + 1];
          const nextInstall = installedLevel < unlockedLevel ? EQUIPMENT[kind][installedLevel + 1] : undefined;
          const canResearch = nextUnlock && game.reputation >= nextUnlock.reputation && game.money >= nextUnlock.unlockCost;

          return (
            <Card key={kind}>
              <CardHeader>
                <span className="mb-2 grid size-10 place-items-center rounded-xl bg-secondary text-primary"><Icon /></span>
                <CardTitle>{TASK_LABELS[kind]}</CardTitle>
                <CardDescription>Vor Ort: {current.name}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {nextInstall ? (
                  <div className="rounded-xl border border-primary/20 bg-secondary/55 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary">Anschaffen</p>
                    <p className="mt-1 font-semibold">{nextInstall.name}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{nextInstall.description}</p>
                    <Button className="mt-3 w-full" disabled={game.money < nextInstall.installCost} onClick={() => onInstall(kind)}>
                      Für {formatMoney(nextInstall.installCost)} installieren
                    </Button>
                  </div>
                ) : nextUnlock ? (
                  <div className="rounded-xl border border-border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nächste Forschung</p><p className="mt-1 font-semibold">{nextUnlock.name}</p></div>
                      {game.reputation < nextUnlock.reputation && <LockKeyhole className="size-4 text-muted-foreground" />}
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{nextUnlock.description}</p>
                    <p className="mt-2 text-xs">Benötigt: Reputation {nextUnlock.reputation}</p>
                    <Button variant="outline" className="mt-3 w-full" disabled={!canResearch} onClick={() => onUnlock(kind)}>
                      Für {formatMoney(nextUnlock.unlockCost)} freischalten
                    </Button>
                  </div>
                ) : (
                  <div className="flex min-h-32 flex-col items-center justify-center rounded-xl bg-muted p-4 text-center">
                    <Check className="mb-2 size-5 text-primary" />
                    <p className="font-semibold">Vollständig ausgebaut</p>
                    <p className="mt-1 text-xs text-muted-foreground">Die beste Technik ist installiert.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FlaskConical className="size-5 text-primary" /> Rasenpflege</CardTitle>
          <CardDescription>Optionale Behandlungen mit klaren Vor- und Nachteilen.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {([
            { id: 'fertilizer' as const, name: 'Dünger', rep: 8, unlock: 700, install: 110, description: 'Wachstum ×1,5 und Wasserbedarf ×1,3. Mehr Mähumsatz, aber auch mehr Arbeit.' },
            { id: 'weedControl' as const, name: 'Unkrautpflege', rep: 15, unlock: 1200, install: 180, description: 'Erhöht den Ertrag jedes Mähvorgangs um 8 %.' },
          ]).map((item) => {
            const unlocked = game.chemistryUnlocked[item.id];
            const installed = selected[item.id];
            return (
              <div key={item.id} className="rounded-xl border border-border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div><p className="font-semibold">{item.name}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.description}</p></div>
                  {installed && <Badge className="bg-emerald-100 text-emerald-800">Aktiv</Badge>}
                </div>
                {!unlocked ? (
                  <Button variant="outline" className="mt-4 w-full" disabled={game.reputation < item.rep || game.money < item.unlock} onClick={() => onUnlockChemistry(item.id)}>
                    Freischalten · {formatMoney(item.unlock)} · Rep. {item.rep}
                  </Button>
                ) : !installed ? (
                  <Button className="mt-4 w-full" disabled={game.money < item.install} onClick={() => onInstallChemistry(item.id)}>
                    Für {formatMoney(item.install)} anwenden
                  </Button>
                ) : null}
              </div>
            );
          })}
        </CardContent>
      </Card>
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
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  useEffect(() => {
    if (game && !game.properties.some((property) => property.id === selectedId)) {
      setSelectedId(game.properties[0]?.id ?? 'bergmann');
      setMobileDetailOpen(false);
    }
  }, [game, selectedId]);

  useEffect(() => {
    if (view !== 'overview') setMobileDetailOpen(false);
  }, [view]);

  const selected = useMemo(
    () => game?.properties.find((property) => property.id === selectedId) ?? game?.properties[0],
    [game, selectedId],
  );

  if (!game || !selected) {
    return (
      <main className="grid min-h-screen place-items-center bg-background">
        <div className="text-center">
          <span className="mx-auto mb-3 grid size-12 animate-pulse place-items-center rounded-2xl bg-primary text-primary-foreground"><Leaf /></span>
          <p className="text-sm font-medium">Der Betrieb wird vorbereitet…</p>
        </div>
      </main>
    );
  }

  const manualBusy = game.properties.some((property) => property.task && taskBlocksPlayer(property.task));
  return (
    <main className="flex min-h-screen flex-col bg-background text-foreground lg:h-screen lg:overflow-hidden">
      <AppHeader
        view={view}
        setView={setView}
        money={game.money}
        reputation={game.reputation}
        weather={game.weather}
        manualBusy={manualBusy}
        onSettings={() => setSettingsOpen(true)}
      />

      {game.activeEvent && (
        <div className="shrink-0 border-b border-amber-200 bg-amber-50 text-amber-950">
          <div className="mx-auto flex max-w-[1540px] items-center gap-3 px-4 py-2 sm:px-5 lg:px-7">
            <BellRing className="size-4 shrink-0 text-amber-700" />
            <p className="min-w-0 flex-1 truncate text-xs sm:text-sm"><strong>{game.activeEvent.title}:</strong> {game.activeEvent.description}</p>
            <Button variant="outline" size="xs" className="border-amber-300 bg-white/70" onClick={resolveEvent}>{game.activeEvent.actionLabel ?? 'Verstanden'}</Button>
          </div>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4 lg:overflow-hidden lg:p-5">
        <div className="mx-auto h-full max-w-[1540px]">
          {view === 'overview' && (
            <div className="grid gap-3 lg:h-full lg:grid-cols-[270px_minmax(0,1fr)_260px]">
              <PropertyRail
                properties={game.properties}
                unlocked={game.unlocked}
                selectedId={selected.id}
                onSelect={(id) => {
                  setSelectedId(id);
                  setMobileDetailOpen(true);
                }}
              />
              <div className="hidden min-h-0 lg:contents">
                <PropertyDetail property={selected} manualBusy={manualBusy} onStart={(kind) => startTask(selected.id, kind)} />
                <OperationsPanel
                  property={selected}
                  unlocked={game.unlocked}
                  money={game.money}
                  onInstall={(kind) => installEquipment(selected.id, kind)}
                />
              </div>
            </div>
          )}
          {view === 'offers' && <OffersView game={game} onAccept={(id) => { acceptOffer(id); setView('overview'); }} onDecline={declineOffer} />}
          {view === 'upgrades' && (
            <UpgradesView
              game={game}
              selected={selected}
              onUnlock={unlockEquipment}
              onInstall={(kind) => installEquipment(selected.id, kind)}
              onUnlockChemistry={unlockChemistry}
              onInstallChemistry={(kind) => installChemistry(selected.id, kind)}
            />
          )}
        </div>
      </div>

      <MobilePropertySheet
        open={mobileDetailOpen && view === 'overview'}
        property={selected}
        manualBusy={manualBusy}
        unlocked={game.unlocked}
        money={game.money}
        onClose={() => setMobileDetailOpen(false)}
        onStart={(kind) => startTask(selected.id, kind)}
        onInstall={(kind) => installEquipment(selected.id, kind)}
      />

      {notice && (
        <output aria-live="polite" className="fixed bottom-4 left-1/2 z-50 flex w-[min(440px,calc(100%-2rem))] -translate-x-1/2 items-center gap-2 rounded-xl border border-border bg-foreground px-4 py-3 text-sm text-background shadow-xl">
          <Sparkles className="size-4 shrink-0" /> {notice}
        </output>
      )}

      {offlineSummary && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/20 p-4 backdrop-blur-sm" role="presentation">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="offline-title"
            className="w-full max-w-md rounded-xl bg-card p-5 shadow-2xl ring-1 ring-foreground/10"
          >
            <span className="mb-4 grid size-11 place-items-center rounded-2xl bg-secondary text-primary"><TrendingUp /></span>
            <h2 id="offline-title" className="text-xl font-semibold">Willkommen zurück</h2>
            <p className="mt-1 text-sm text-muted-foreground">Dein Betrieb lief {humanOfflineDuration(offlineSummary.elapsedMs)} ohne dich weiter.</p>
            <div className="my-5 grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-muted p-3 text-center"><Banknote className="mx-auto mb-1 size-4 text-primary" /><strong className="block text-sm">{formatMoney(offlineSummary.earned)}</strong><span className="text-[10px] text-muted-foreground">verdient</span></div>
              <div className="rounded-lg bg-muted p-3 text-center"><Check className="mx-auto mb-1 size-4 text-primary" /><strong className="block text-sm">{offlineSummary.completed}</strong><span className="text-[10px] text-muted-foreground">erledigt</span></div>
              <div className="rounded-lg bg-muted p-3 text-center"><CircleAlert className="mx-auto mb-1 size-4 text-amber-600" /><strong className="block text-sm">{offlineSummary.critical}</strong><span className="text-[10px] text-muted-foreground">kritisch</span></div>
            </div>
            <Button className="w-full" autoFocus onClick={dismissOfflineSummary}>Betrieb prüfen</Button>
          </section>
        </div>
      )}

      {settingsOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/20 p-4 backdrop-blur-sm" onMouseDown={() => setSettingsOpen(false)}>
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-title"
            className="w-full max-w-sm rounded-xl bg-card p-5 shadow-2xl ring-1 ring-foreground/10"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="settings-title" className="text-lg font-semibold">Einstellungen</h2>
                <p className="mt-1 text-sm text-muted-foreground">Der Spielstand wird automatisch in diesem Browser gespeichert.</p>
              </div>
              <Button variant="ghost" size="icon-sm" aria-label="Schließen" onClick={() => setSettingsOpen(false)}><X /></Button>
            </div>
            <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3">
              <p className="text-sm font-semibold text-red-900">Betrieb neu starten</p>
              <p className="mt-1 text-xs text-red-700">Entfernt Geld, Verträge und alle freigeschalteten Upgrades.</p>
              <Button variant="destructive" className="mt-3" onClick={() => { setSettingsOpen(false); resetGame(); }}><RotateCcw /> Neu starten</Button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
