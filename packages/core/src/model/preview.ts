import { PLACEHOLDERS, type PlaceholderName } from './placeholders';
import { activeStatus, effectiveCharLimit, type ChatboxProfile } from './profile';
import type { Segment } from './segments';
import { renderTemplate, type TemplateValues } from './template';

export type PreviewMode = 'desktop' | 'vr';

export interface PreviewSegment {
  readonly segment: Segment;
  readonly text: string;
  /** False when the segment is disabled or hidden in this mode. */
  readonly shown: boolean;
}

export interface Preview {
  readonly text: string;
  readonly length: number;
  readonly limit: number;
  readonly overLimit: boolean;
  readonly segments: readonly PreviewSegment[];
}

export function sampleValues(profile: ChatboxProfile): TemplateValues {
  const values: Partial<Record<PlaceholderName, string>> = {};
  for (const name of Object.keys(PLACEHOLDERS) as PlaceholderName[]) {
    values[name] = PLACEHOLDERS[name].sample;
  }
  values.status = activeStatus(profile)?.text ?? '';
  return values;
}

export function isSegmentVisible(segment: Segment, mode: PreviewMode): boolean {
  return segment.enabled && (mode === 'vr' ? segment.visibility.vr : segment.visibility.desktop);
}

/** Render the whole line with sample data, the way VRChat would receive it. */
export function renderPreview(
  profile: ChatboxProfile,
  mode: PreviewMode,
  values: TemplateValues = sampleValues(profile),
): Preview {
  const segments = profile.segments.map((segment): PreviewSegment => {
    const shown = isSegmentVisible(segment, mode);
    const text = shown ? renderTemplate(segment.template, values, { tidyEmpty: true }) : '';
    return { segment, text, shown: shown && text !== '' };
  });
  const parts = segments.filter((entry) => entry.shown).map((entry) => entry.text);
  const separator = profile.output.separateWithNewlines ? '\n' : profile.output.separator;
  const text = profile.output.prefix + parts.join(separator) + profile.output.suffix;
  const limit = effectiveCharLimit(profile.output);
  // VRChat is a C# app: its 144 limit counts UTF-16 code units, exactly like `.length`.
  const length = text.length;
  return { text, length, limit, overLimit: length > limit, segments };
}
