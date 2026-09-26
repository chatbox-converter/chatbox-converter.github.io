import { describe, expect, it } from 'vitest';
import {
  parseTemplate,
  placeholdersIn,
  renameTemplateTokens,
  renderTemplate,
  unknownPlaceholdersIn,
} from './template';

describe('parseTemplate', () => {
  it('splits text and placeholders, case-insensitively', () => {
    expect(parseTemplate('▶ {Artist} - {title}')).toEqual([
      { kind: 'text', text: '▶ ' },
      { kind: 'placeholder', name: 'artist', raw: '{Artist}' },
      { kind: 'text', text: ' - ' },
      { kind: 'placeholder', name: 'title', raw: '{title}' },
    ]);
  });

  it('keeps unknown tokens as unknown', () => {
    expect(parseTemplate('{nope}')).toEqual([{ kind: 'unknown', name: 'nope', raw: '{nope}' }]);
    expect(unknownPlaceholdersIn('{nope} {title} {Nope}')).toEqual(['nope', 'Nope']);
  });

  it('lists distinct placeholders in order', () => {
    expect(placeholdersIn('{title} {artist} {title}')).toEqual(['title', 'artist']);
  });
});

describe('renderTemplate', () => {
  it('substitutes values and leaves unknown tokens literal', () => {
    expect(renderTemplate('{artist} - {title} {x}', { artist: 'Ado', title: 'Show' })).toBe(
      'Ado - Show {x}',
    );
  });

  it('tidies one adjacent separator around empty values', () => {
    expect(renderTemplate('A | {album} | B', { album: '' }, { tidyEmpty: true })).toBe('A | B');
    expect(
      renderTemplate('{artist} : {title}', { artist: '', title: 'Show' }, { tidyEmpty: true }),
    ).toBe('Show');
    expect(
      renderTemplate('{artist} : {title}', { artist: 'Ado', title: '' }, { tidyEmpty: true }),
    ).toBe('Ado');
  });

  it('collapses whitespace runs left behind', () => {
    expect(renderTemplate('{artist}  {title}', { artist: 'Ado', title: '' })).toBe('Ado');
  });
});

describe('renameTemplateTokens', () => {
  it('maps tokens and keeps unmapped ones', () => {
    expect(
      renameTemplateTokens('{songbar} {bar} {title}', {
        songbar: 'progress_bar',
        bar: 'progress_bar',
      }),
    ).toBe('{progress_bar} {progress_bar} {title}');
  });
});
