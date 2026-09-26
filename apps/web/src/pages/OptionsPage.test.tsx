import {
  DEFAULT_SEGMENT_TEMPLATES,
  createDefaultProfile,
  createSegment,
} from '@chatbox-converter/core';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { OptionsPage } from '@/pages/OptionsPage';
import { ProfileProvider } from '@/state/ProfileProvider';

function renderPage(): void {
  const profile = createDefaultProfile({
    segments: [
      createSegment('status'),
      createSegment('media', { id: 'm1' }),
      createSegment('time', { id: 't1' }),
    ],
  });
  render(
    <ProfileProvider initial={profile}>
      <OptionsPage />
    </ProfileProvider>,
  );
}

function musicSection(): HTMLElement {
  return screen.getByRole('region', { name: 'Music options' });
}

describe('OptionsPage', () => {
  afterEach(() => {
    cleanup();
    window.location.hash = '';
  });

  it('renders the fixed sections and one per present segment kind, collapsed', () => {
    renderPage();
    for (const name of ['Status options', 'Line options', 'OSC', 'Music options', 'Time options']) {
      expect(screen.getByRole('button', { name }).getAttribute('aria-expanded')).toBe('false');
    }
    expect(screen.queryByRole('button', { name: 'Weather options' })).toBeNull();
    expect(screen.getByText('Music')).toBeTruthy();
    expect(screen.getByText('On screen')).toBeTruthy();
  });

  it('expanding a section and editing the template updates the preview', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Music options' }));
    const section = musicSection();
    const input = within(section).getByLabelText('Template');
    fireEvent.change(input, { target: { value: 'Now: {artist}!' } });
    const [preview] = within(section).getAllByTestId('segment-preview');
    expect(preview?.textContent).toBe('Now: Ado!');
  });

  it('inserting a placeholder chip adds {name} to the template', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Music options' }));
    const section = musicSection();
    const input = within(section).getByLabelText<HTMLInputElement>('Template');
    fireEvent.change(input, { target: { value: 'x' } });
    fireEvent.click(within(section).getByRole('button', { name: /^Album/ }));
    expect(input.value).toContain('{album}');
    expect(input.value).toHaveLength('x{album}'.length);
  });

  it('Reset restores the default template', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Music options' }));
    const section = musicSection();
    const input = within(section).getByLabelText<HTMLInputElement>('Template');
    fireEvent.change(input, { target: { value: 'changed' } });
    expect(input.value).toBe('changed');
    fireEvent.click(within(section).getByRole('button', { name: 'Reset Music options' }));
    expect(input.value).toBe(DEFAULT_SEGMENT_TEMPLATES.media);
  });

  it('expands the section named in the hash', () => {
    window.location.hash = '#/options?section=time&segment=t1';
    renderPage();
    expect(screen.getByRole('button', { name: 'Time options' }).getAttribute('aria-expanded')).toBe(
      'true',
    );
    expect(
      screen.getByRole('button', { name: 'Music options' }).getAttribute('aria-expanded'),
    ).toBe('false');
    expect(screen.getByText('Use the 24-hour clock')).toBeTruthy();
  });

  it('opens a section when the hash changes while mounted', () => {
    renderPage();
    window.location.hash = '#/options?section=status';
    fireEvent(window, new Event('hashchange'));
    expect(
      screen.getByRole('button', { name: 'Status options' }).getAttribute('aria-expanded'),
    ).toBe('true');
  });
});
