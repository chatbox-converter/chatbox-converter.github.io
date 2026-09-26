import { describe, expect, it } from 'vitest';
import { dateToDotnetTicks, dotnetTicksToDate } from './dotnet';

describe('dotnet ticks', () => {
  it('round-trips the Unix epoch', () => {
    expect(dateToDotnetTicks(new Date(0))).toBe(621_355_968_000_000_000n);
    expect(dotnetTicksToDate(621_355_968_000_000_000n).getTime()).toBe(0);
  });

  it('round-trips an arbitrary date', () => {
    const date = new Date('2026-09-26T12:34:56.789Z');
    expect(dotnetTicksToDate(dateToDotnetTicks(date)).getTime()).toBe(date.getTime());
  });
});
