import { useEffect, useId, useRef, type ReactNode } from 'react';
import styles from './OptionSection.module.css';

interface OptionSectionProps {
  readonly title: string;
  /** Small muted suffix after the title, e.g. the id of a second Music segment. */
  readonly subtitle?: string;
  readonly expanded: boolean;
  readonly onToggle: () => void;
  readonly onReset: () => void;
  /** Scroll the section into view (used for the section named in the URL). */
  readonly scrollTo?: boolean;
  readonly children: ReactNode;
}

/** Collapsible "… options" section with the ⊕/⊖ toggle and the Reset button top-right. */
export function OptionSection({
  title,
  subtitle,
  expanded,
  onToggle,
  onReset,
  scrollTo = false,
  children,
}: OptionSectionProps): React.JSX.Element {
  const bodyId = useId();
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (scrollTo) {
      ref.current?.scrollIntoView({ block: 'start' });
    }
  }, [scrollTo]);

  const label = subtitle === undefined ? title : `${title} ${subtitle}`;
  return (
    <section ref={ref} className={styles.section} aria-label={label}>
      <div className={styles.header}>
        <button
          type="button"
          className={styles.toggle}
          aria-expanded={expanded}
          aria-controls={bodyId}
          onClick={onToggle}
        >
          <img
            className={styles.icon}
            src={expanded ? '/icons/Min_ico.png' : '/icons/Plus_ico.png'}
            alt=""
            width="16"
            height="16"
          />
          <span className={styles.title}>{title}</span>
          {subtitle === undefined ? null : <span className={styles.count}>{subtitle}</span>}
        </button>
      </div>
      <button
        type="button"
        className={styles.reset}
        title="Reset this section's settings to their defaults"
        aria-label={`Reset ${label}`}
        onClick={onReset}
      >
        Reset
      </button>
      {expanded ? (
        <div id={bodyId} className={styles.body}>
          {children}
        </div>
      ) : null}
    </section>
  );
}
