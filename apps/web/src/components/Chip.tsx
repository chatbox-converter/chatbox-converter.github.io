import { cx } from '@/lib/cx';
import styles from './Chip.module.css';

interface ChipProps {
  readonly label: string;
  readonly on?: boolean;
  readonly onClick?: () => void;
  readonly title?: string;
  /** Visual family: route = DESKTOP/VR, feature = TRANSIENT/LYRICS…, door = CUSTOMIZE ›. */
  readonly variant?: 'route' | 'feature' | 'door' | 'static';
  readonly disabled?: boolean;
}

export function Chip({
  label,
  on = false,
  onClick,
  title,
  variant = 'route',
  disabled = false,
}: ChipProps): React.JSX.Element {
  if (onClick === undefined) {
    return (
      <span className={cx(styles.chip, styles[variant], on && styles.on)} title={title}>
        {label}
      </span>
    );
  }
  return (
    <button
      type="button"
      className={cx(styles.chip, styles[variant], on && styles.on)}
      aria-pressed={variant === 'door' ? undefined : on}
      title={title}
      disabled={disabled}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
