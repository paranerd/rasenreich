'use client';

import { Droplet, Sprout, Wrench } from 'lucide-react';

import {
  conditionHint,
  grassHint,
  moistureHint,
  TASK_LABELS,
  TaskKind,
} from '@/lib/game';

export type GaugeVariant = 'bar' | 'ring' | 'mini';

/** Jede Tätigkeit behält in Balken, Ringen und Übersicht dieselbe Farbe. */
function kindColor(kind: TaskKind) {
  if (kind === 'mow') return 'var(--kind-grass)';
  if (kind === 'water') return 'var(--kind-water)';
  return 'var(--kind-cond)';
}

/** Zahlen und Hinweise bewerten weiterhin, wie gut der aktuelle Zustand ist. */
function statusColor(kind: TaskKind, value: number) {
  if (kind === 'mow') {
    if (value >= 45) return 'var(--tone-ok)';
    if (value >= 10) return 'var(--tone-warn)';
    return 'var(--tone-bad)';
  }
  if (kind === 'water') {
    if (value >= 60) return 'var(--tone-ok)';
    if (value >= 25) return 'var(--tone-dry)';
    return 'var(--tone-bad)';
  }
  if (value >= 70) return 'var(--tone-ok)';
  if (value >= 45) return 'var(--tone-warn)';
  return 'var(--tone-bad)';
}

export function metricHint(kind: TaskKind, value: number) {
  if (kind === 'mow') return grassHint(value);
  if (kind === 'water') return moistureHint(value);
  return conditionHint(value);
}

export function metricToneColor(kind: TaskKind, value: number) {
  return statusColor(kind, value);
}

interface GaugeProps {
  kind: TaskKind;
  value: number;
  variant?: GaugeVariant;
  label?: string;
  className?: string;
}

function MetricIcon({
  kind,
  className = '',
}: {
  kind: TaskKind;
  className?: string;
}) {
  const Icon = kind === 'mow' ? Sprout : kind === 'water' ? Droplet : Wrench;
  return (
    <Icon
      className={`gauge__metric-icon gauge__metric-icon--${kind} ${className}`}
      aria-hidden="true"
    />
  );
}

export function Gauge({
  kind,
  value,
  variant = 'bar',
  label,
  className,
}: GaugeProps) {
  const fill = Math.max(0, Math.min(100, value));
  const rounded = Math.round(Math.max(0, value));
  const kindTone = kindColor(kind);
  const statusTone = statusColor(kind, value);
  const text = label ?? TASK_LABELS[kind];
  const hint = metricHint(kind, value);
  const meter = {
    role: 'meter' as const,
    'aria-valuemin': 0,
    'aria-valuemax': Math.max(100, rounded),
    'aria-valuenow': rounded,
    'aria-label': `${text}: ${rounded} %`,
  };

  if (variant === 'mini') {
    return (
      <div
        className={`gauge gauge--mini ${className ?? ''}`}
        title={`${text}: ${rounded} % — ${hint}`}
        {...meter}
      >
        <MetricIcon kind={kind} className="gauge__mini-icon" />
        <span className="gauge__mini-track">
          <span
            className="gauge__fill"
            style={{ width: `${fill}%`, background: kindTone }}
          />
        </span>
      </div>
    );
  }

  if (variant === 'ring') {
    // 270-Grad-Bogen: r=26, Umfang ~163,4, davon drei Viertel sichtbar
    const circumference = 2 * Math.PI * 26;
    const arc = circumference * 0.75;
    return (
      <div className={`gauge gauge--ring ${className ?? ''}`} {...meter}>
        <div className="gauge__dial">
          <svg
            className="gauge__dial-svg"
            width="64"
            height="64"
            viewBox="0 0 64 64"
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
              stroke={kindTone}
              strokeWidth="7"
              strokeLinecap="butt"
              strokeDasharray={`${(arc * fill) / 100} ${circumference}`}
            />
          </svg>
          <span className="gauge__dial-value" style={{ color: kindTone }}>
            {rounded}
          </span>
          <MetricIcon kind={kind} className="gauge__dial-icon" />
        </div>
        <div className="gauge__foot">
          <span className="gauge__label">{text}</span>
          <span className="gauge__hint" style={{ color: statusTone }}>
            {hint}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`gauge ${className ?? ''}`} title={hint} {...meter}>
      <div className="gauge__head">
        <span className="gauge__title">
          <MetricIcon kind={kind} />
          <span className="gauge__label">{text}</span>
        </span>
        <span className="gauge__value" style={{ color: kindTone }}>
          {rounded} %
        </span>
      </div>
      <div className="gauge__track">
        <div
          className="gauge__fill"
          style={{ width: `${fill}%`, background: kindTone }}
        />
      </div>
    </div>
  );
}
