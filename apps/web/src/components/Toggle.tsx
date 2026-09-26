import { cx } from '@/lib/cx';
import styles from './Toggle.module.css';

interface ToggleProps {
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
  readonly label: string;
  readonly size?: 'normal' | 'large';
  readonly disabled?: boolean;
}

/** The pill switch used on every integration card and in the title bar. */
export function Toggle({
  checked,
  onChange,
  label,
  size = 'normal',
  disabled = false,
}: ToggleProps): React.JSX.Element {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className={cx(styles.toggle, size === 'large' && styles.large, checked && styles.on)}
      onClick={() => {
        onChange(!checked);
      }}
    >
      <span className={styles.thumb} />
    </button>
  );
}
