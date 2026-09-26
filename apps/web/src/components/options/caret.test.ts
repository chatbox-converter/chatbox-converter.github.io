import { describe, expect, it } from 'vitest';
import { insertAtCaret } from './caret';

describe('insertAtCaret', () => {
  it('inserts at the caret and moves it behind the insertion', () => {
    expect(insertAtCaret('ab', '{x}', 1)).toEqual({ value: 'a{x}b', caret: 4 });
  });

  it('replaces a selection', () => {
    expect(insertAtCaret('hello world', '{x}', 6, 11)).toEqual({ value: 'hello {x}', caret: 9 });
  });

  it('appends when the caret is unknown', () => {
    expect(insertAtCaret('ab', '{x}', null)).toEqual({ value: 'ab{x}', caret: 5 });
  });

  it('clamps out-of-range and reversed positions', () => {
    expect(insertAtCaret('ab', '-', 99)).toEqual({ value: 'ab-', caret: 3 });
    expect(insertAtCaret('ab', '-', -4, -1)).toEqual({ value: '-ab', caret: 1 });
    expect(insertAtCaret('abcd', '-', 3, 1)).toEqual({ value: 'abc-d', caret: 4 });
  });
});
