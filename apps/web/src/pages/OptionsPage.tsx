import type { Segment } from '@chatbox-converter/core';
import { useEffect, useState } from 'react';
import { LineOptionsSection, OscSection } from '@/components/options/LineOptionsSection';
import { OptionGroupHeader } from '@/components/options/OptionGroupHeader';
import {
  LINE_SECTION,
  OSC_SECTION,
  STATUS_SECTION,
  groupSegments,
  parseOptionsHash,
  sectionKeyForTarget,
  segmentSectionKey,
} from '@/components/options/options-layout';
import { SegmentSection } from '@/components/options/SegmentSection';
import { StatusOptionsSection } from '@/components/options/StatusOptionsSection';
import { useProfile } from '@/state/profile-context';
import styles from './OptionsPage.module.css';

export function OptionsPage(): React.JSX.Element {
  const { profile } = useProfile();
  const [target, setTarget] = useState<string | null>(() => targetFromHash(profile.segments));
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(
    () => new Set(target === null ? [] : [target]),
  );

  useEffect(() => {
    function onHashChange(): void {
      const next = targetFromHash(profile.segments);
      setTarget(next);
      if (next !== null) {
        setExpanded((open) => new Set([...open, next]));
      }
    }
    window.addEventListener('hashchange', onHashChange);
    return () => {
      window.removeEventListener('hashchange', onHashChange);
    };
  }, [profile.segments]);

  function toggle(key: string): void {
    setExpanded((open) => {
      const next = new Set(open);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  const sectionProps = (key: string) => ({
    expanded: expanded.has(key),
    onToggle: () => {
      toggle(key);
    },
    scrollTo: target === key,
  });
  const groups = groupSegments(profile.segments);

  return (
    <div className={styles.page}>
      <OptionGroupHeader title="Your message" />
      <StatusOptionsSection {...sectionProps(STATUS_SECTION)} />

      <OptionGroupHeader title="Chatbox line" />
      <LineOptionsSection {...sectionProps(LINE_SECTION)} />
      <OscSection {...sectionProps(OSC_SECTION)} />

      {groups.map((group) => (
        <div key={group.title}>
          <OptionGroupHeader title={group.title} />
          {group.segments.map((segment) => {
            const siblings = group.segments.filter((other) => other.kind === segment.kind);
            return (
              <SegmentSection
                key={segment.id}
                segment={segment}
                {...(siblings.length > 1 ? { subtitle: `#${segment.id.slice(0, 8)}` } : {})}
                {...sectionProps(segmentSectionKey(segment.id))}
              />
            );
          })}
        </div>
      ))}
      {groups.length === 0 ? (
        <p className={styles.empty}>
          Add an integration on the Integrations page and its options will appear here.
        </p>
      ) : null}

      <p className={styles.footer}>
        Runs entirely in your browser. Nothing you enter here leaves this page.
      </p>
    </div>
  );
}

function targetFromHash(segments: readonly Segment[]): string | null {
  const parsed = parseOptionsHash(window.location.hash);
  return parsed === null ? null : sectionKeyForTarget(parsed, segments);
}
