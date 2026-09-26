import { describe, expect, it } from 'vitest';
import { renderPreview } from './preview';
import { createDefaultProfile, createStatusItem } from './profile';
import { createSegment } from './segments';

describe('renderPreview', () => {
  it('joins visible segments with newlines and counts characters', () => {
    const profile = createDefaultProfile({
      statuses: [createStatusItem('hi', { active: true })],
      segments: [
        createSegment('status', { id: 's' }),
        createSegment('time', { id: 't', template: '{time}' }),
        createSegment('weather', { id: 'w', enabled: false }),
      ],
    });
    const preview = renderPreview(profile, 'desktop');
    expect(preview.text).toBe('hi\n21:41');
    expect(preview.length).toBe(8);
    expect(preview.limit).toBe(144);
    expect(preview.segments.map((s) => s.shown)).toEqual([true, true, false]);
  });

  it('respects VR/desktop visibility and the minimal background limit', () => {
    const profile = createDefaultProfile({
      output: {
        separator: ' | ',
        separateWithNewlines: false,
        prefix: '',
        suffix: '',
        minimalBackground: true,
        sendIntervalSeconds: 1,
      },
      segments: [
        createSegment('time', { template: '{time}', visibility: { desktop: false, vr: true } }),
        createSegment('heartrate', { template: '{heartrate}' }),
      ],
    });
    expect(renderPreview(profile, 'desktop').text).toBe('82');
    expect(renderPreview(profile, 'vr').text).toBe('21:41 | 82');
    expect(renderPreview(profile, 'vr').limit).toBe(142);
  });

  it('flags lines over the limit', () => {
    const profile = createDefaultProfile({
      segments: [createSegment('custom', { template: 'x'.repeat(150) })],
    });
    expect(renderPreview(profile, 'desktop').overLimit).toBe(true);
  });
});
