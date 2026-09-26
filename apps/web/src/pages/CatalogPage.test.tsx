import { PLACEHOLDER_CATEGORIES, PLACEHOLDER_NAMES } from '@chatbox-converter/core';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CatalogPage } from '@/pages/CatalogPage';

function tables(): HTMLElement[] {
  return screen.queryAllByRole('table');
}

function firstTable(): HTMLElement {
  const table = tables()[0];
  if (table === undefined) throw new Error('no table rendered');
  return table;
}

function dataRows(): HTMLElement[] {
  return tables().flatMap((table) =>
    within(table)
      .getAllByRole('row')
      .filter((row) => row.hasAttribute('data-placeholder')),
  );
}

describe('CatalogPage', () => {
  afterEach(cleanup);

  it('renders one table per category with every placeholder', () => {
    render(<CatalogPage />);
    expect(tables()).toHaveLength(PLACEHOLDER_CATEGORIES.length);
    expect(dataRows()).toHaveLength(PLACEHOLDER_NAMES.length);
    expect(screen.getByRole('heading', { name: 'Heart rate' })).toBeTruthy();
    expect(screen.getByText(/^90 of 90 placeholders · covered by all three: \d+/)).toBeTruthy();
  });

  it('narrows rows with the search box and category chips', () => {
    render(<CatalogPage />);
    const search = screen.getByRole('searchbox', { name: 'Search placeholders' });
    fireEvent.change(search, { target: { value: 'pulsoid' } });
    const names = dataRows().map((row) => row.getAttribute('data-placeholder'));
    expect(names).toContain('heartrate');
    expect(names).not.toContain('artist');
    expect(names.length).toBeLessThan(10);
    fireEvent.change(search, { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Twitch' }));
    expect(tables()).toHaveLength(1);
    expect(dataRows()).toHaveLength(6);
    fireEvent.change(search, { target: { value: 'no-such-thing' } });
    expect(tables()).toHaveLength(0);
    expect(screen.getByText(/No placeholder matches/)).toBeTruthy();
  });

  it('hides an app column when its toggle is off', () => {
    render(<CatalogPage />);
    const headers = (): string[] =>
      within(firstTable())
        .getAllByRole('columnheader')
        .map((cell) => cell.textContent);
    expect(headers()).toEqual(['Placeholder', 'Sample', 'MagicChatbox', 'VRCOSC', 'DreamChatbox']);
    fireEvent.click(screen.getByRole('button', { name: 'VRCOSC' }));
    expect(headers()).toEqual(['Placeholder', 'Sample', 'MagicChatbox', 'DreamChatbox']);
    fireEvent.click(screen.getByRole('button', { name: 'VRCOSC' }));
    expect(headers()).toHaveLength(5);
  });

  it('copies the placeholder to the clipboard and shows a brief "copied" state', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    render(<CatalogPage />);
    const button = screen.getByRole('button', { name: 'Copy {artist}' });
    fireEvent.click(button);
    expect(writeText).toHaveBeenCalledWith('{artist}');
    await waitFor(() => {
      expect(within(button).getByText('copied')).toBeTruthy();
    });
  });

  it('links community modules to their repository', () => {
    render(<CatalogPage />);
    const links = screen.getAllByRole('link', { name: /Linux Media/ });
    expect(links.length).toBeGreaterThan(0);
    expect(links[0]?.getAttribute('target')).toBe('_blank');
    expect(links[0]?.getAttribute('rel')).toBe('noreferrer');
    expect(links[0]?.getAttribute('href')).toMatch(/^https:\/\/github\.com\//);
  });
});
