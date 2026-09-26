import styles from './OptionGroupHeader.module.css';

interface OptionGroupHeaderProps {
  readonly title: string;
}

/** "Your message", "Music", … : accent bar, Comfortaa title and a fading hairline. */
export function OptionGroupHeader({ title }: OptionGroupHeaderProps): React.JSX.Element {
  return (
    <div className={styles.header} role="heading" aria-level={1}>
      <span className={styles.bar} aria-hidden="true" />
      <span className={styles.title}>{title}</span>
      <span className={styles.hairline} aria-hidden="true" />
    </div>
  );
}
