'use client';

import { conditionHint, grassHint, moistureHint, TASK_LABELS, TaskKind } from '@/lib/game';

export type GaugeVariant = 'bar' | 'ring' | 'mini';

const KIND_COLOR: Record<TaskKind, string> = {
  mow: 'var(--kind-grass)',
  water: 'var(--kind-water)',
  maintain: 'var(--kind-cond)',
};

/**
 * Zustands-Ton auf der vereinheitlichten 0-100-%-Skala: je höher, desto besser.
 * Die Schwellen spiegeln die Hinweistexte aus lib/game.ts.
 */
function toneColor(kind: TaskKind, value: number) {
  if (kind === 'mow') {
    if (value >= 45) return 'var(--tone-ok)';
    if (value >= 10) return 'var(--tone-warn)';
    return 'var(--tone-bad)';
  }
  if (kind === 'water') {
    if (value > 100) return 'var(--tone-warn)';
    if (value >= 60) return 'var(--tone-ok)';
    if (value >= 25) return 'var(--tone-dry)';
    return 'var(--tone-bad)';
  }
  if (value >= 75) return 'var(--tone-ok)';
  if (value >= 20) return 'var(--tone-warn)';
  return 'var(--tone-bad)';
}

export function metricHint(kind: TaskKind, value: number) {
  if (kind === 'mow') return grassHint(value);
  if (kind === 'water') return moistureHint(value);
  return conditionHint(value);
}

export function metricToneColor(kind: TaskKind, value: number) {
  return toneColor(kind, value);
}

interface GaugeProps {
  kind: TaskKind;
  value: number;
  variant?: GaugeVariant;
  label?: string;
  className?: string;
}

export function Gauge({ kind, value, variant = 'bar', label, className }: GaugeProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const rounded = Math.round(clamped);
  const tone = toneColor(kind, value);
  const text = label ?? TASK_LABELS[kind];
  const hint = metricHint(kind, value);

  if (variant === 'mini') {
    return (
      <div
        className={`relative h-[3px] overflow-hidden rounded-sm bg-track ${className ?? ''}`}
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={rounded}
        aria-label={`${text}: ${rounded} %`}
        title={`${text}: ${rounded} % — ${hint}`}
      >
        <div
          className="absolute inset-y-0 left-0"
          style={{ width: `${clamped}%`, background: KIND_COLOR[kind] }}
        />
      </div>
    );
  }

  if (variant === 'ring') {
    // 270-Grad-Bogen: r=26, Umfang ~163,4, davon drei Viertel sichtbar
    const circumference = 2 * Math.PI * 26;
    const arc = circumference * 0.75;
    return (
      <div
        className={`flex flex-col items-center gap-1.5 ${className ?? ''}`}
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={rounded}
        aria-label={`${text}: ${rounded} %`}
      >
        <div className="relative size-16">
          <svg
            width="64"
            height="64"
            viewBox="0 0 64 64"
            className="rotate-[135deg]"
            aria-hidden="true"
          >
            <circle
              cx="32"
              cy="32"
              r="26"
              fill="none"
              stroke="var(--track)"
              strokeWidth="7"
              strokeDasharray={`${arc} ${circumference}`}
            />
            <circle
              cx="32"
              cy="32"
              r="26"
              fill="none"
              stroke={KIND_COLOR[kind]}
              strokeWidth="7"
              strokeLinecap="butt"
              strokeDasharray={`${(arc * clamped) / 100} ${circumference}`}
            />
          </svg>
          <div className="absolute inset-0 grid place-items-center">
            <span className="font-mono text-[17px] font-semibold leading-none text-ink tabular-nums">
              {rounded}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-center gap-0.5 text-center">
          <span className="rr-label text-[9.5px] leading-none">{text}</span>
          <span className="text-[9px] leading-tight" style={{ color: tone }}>
            {hint}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex w-full flex-col gap-1.5 ${className ?? ''}`}
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={rounded}
      aria-label={`${text}: ${rounded} %`}
      title={hint}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="rr-label text-[9.5px] leading-none tracking-[0.1em]">{text}</span>
        <span
          className="font-mono text-xs font-semibold leading-none tabular-nums"
          style={{ color: tone }}
        >
          {rounded} %
        </span>
      </div>
      <div className="relative h-[7px] overflow-hidden rounded bg-track">
        <div
          className="absolute inset-y-0 left-0 rounded"
          style={{ width: `${clamped}%`, background: KIND_COLOR[kind] }}
        />
      </div>
    </div>
  );
}
