import type { ButtonHTMLAttributes } from 'react';

export type ButtonVariant = 'default' | 'outline' | 'ghost' | 'destructive';
export type ButtonSize = 'default' | 'xs' | 'icon';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

/**
 * Schlichte Schaltfläche. Die Varianten sind reine Klassen aus
 * `styles/_button.scss`; Abstände und Breiten setzt der jeweilige Kontext.
 */
export function Button({
  variant = 'default',
  size = 'default',
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  const classes = ['btn', `btn--${variant}`];
  if (size !== 'default') classes.push(`btn--${size}`);
  if (className) classes.push(className);

  return <button type={type} className={classes.join(' ')} {...props} />;
}
