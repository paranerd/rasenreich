'use client';

import { conditionHint, grassHint, moistureHint, TASK_LABELS, TaskKind } from '@/lib/game';

export type GaugeVariant = 'bar' | 'ring' | 'mini';

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
  // Die Füllung endet bei 100 %, der abgelesene Wert nicht: Regen kann die
  // Feuchtigkeit darüber treiben, und das soll sichtbar bleiben.
  const fill = Math.max(0, Math.min(100, value));
  const rounded = Math.round(Math.max(0, value));
  const tone = toneColor(kind, value);
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
        className={`gauge gauge--mini kind--${kind} ${className ?? ''}`}
        title={`${text}: ${rounded} % — ${hint}`}
        {...meter}
      >
        <div className="gauge__fill" style={{ width: `${fill}%` }} />
      </div>
    );
  }

  if (variant === 'ring') {
    // 270-Grad-Bogen: r=26, Umfang ~163,4, davon drei Viertel sichtbar
    const circumference = 2 * Math.PI * 26;
    const arc = circumference * 0.75;
    return (
      <div className={`gauge gauge--ring kind--${kind} ${className ?? ''}`} {...meter}>
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
              stroke="var(--kind)"
              strokeWidth="7"
              strokeLinecap="butt"
              strokeDasharray={`${(arc * fill) / 100} ${circumference}`}
            />
          </svg>
          <span className="gauge__dial-value">{rounded}</span>
        </div>
        <div className="gauge__foot">
          <span className="gauge__label">{text}</span>
          <span className="gauge__hint" style={{ color: tone }}>
            {hint}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`gauge kind--${kind} ${className ?? ''}`} title={hint} {...meter}>
      <div className="gauge__head">
        <span className="gauge__label">{text}</span>
        <span className="gauge__value" style={{ color: tone }}>
          {rounded} %
        </span>
      </div>
      <div className="gauge__track">
        <div className="gauge__fill" style={{ width: `${fill}%` }} />
      </div>
    </div>
  );
}
