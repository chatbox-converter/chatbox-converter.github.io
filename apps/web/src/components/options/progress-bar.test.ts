import { DEFAULT_PROGRESS_BAR } from '@chatbox-converter/core';
import { describe, expect, it } from 'vitest';
import { renderProgressBar } from './progress-bar';

describe('renderProgressBar', () => {
  it('draws caps, filled cells, the marker and empty cells', () => {
    const bar = renderProgressBar(
      { length: 10, filled: '=', empty: '-', position: 'o', start: '[', end: ']' },
      0.35,
    );
    expect(bar).toBe('[===o------]');
    expect(bar).toHaveLength(12);
  });

  it('omits the marker when it is empty', () => {
    expect(
      renderProgressBar(
        { length: 4, filled: '#', empty: '.', position: '', start: '', end: '' },
        0.5,
      ),
    ).toBe('##..');
  });

  it('clamps the fraction and keeps the default bar at its length', () => {
    expect(renderProgressBar(DEFAULT_PROGRESS_BAR, 2)).toHaveLength(12);
    expect(renderProgressBar(DEFAULT_PROGRESS_BAR, -1).startsWith('┣●')).toBe(true);
  });
});
