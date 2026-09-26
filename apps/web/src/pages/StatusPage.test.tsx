import { createDefaultProfile, createStatusItem } from '@chatbox-converter/core';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { StatusPage } from '@/pages/StatusPage';
import { ProfileProvider } from '@/state/ProfileProvider';

function renderPage(): void {
  const profile = createDefaultProfile({
    statuses: [
      createStatusItem('Hello there', { id: 'a', active: true }),
      createStatusItem('Fun one', { id: 'b', group: 'Fun' }),
      createStatusItem('Fun two', { id: 'c', group: 'Fun', useInCycle: true }),
    ],
    statusCycle: { enabled: false, intervalSeconds: 5, random: false },
  });
  render(
    <ProfileProvider initial={profile}>
      <StatusPage />
    </ProfileProvider>,
  );
}

function rows(): HTMLElement[] {
  return within(screen.getByRole('list', { name: 'Statuses' })).queryAllByRole('listitem');
}

describe('StatusPage', () => {
  afterEach(cleanup);

  it('creates a status from the composer and clears the box', () => {
    renderPage();
    const input = screen.getByRole('textbox', { name: 'New status' });
    fireEvent.change(input, { target: { value: 'Brand new' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));
    expect(rows()).toHaveLength(4);
    expect(screen.getByText('Brand new')).toBeTruthy();
    expect((input as HTMLInputElement).value).toBe('');
  });

  it('creates a status with Enter', () => {
    renderPage();
    const input = screen.getByRole('textbox', { name: 'New status' });
    fireEvent.change(input, { target: { value: 'Via enter' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByText('Via enter')).toBeTruthy();
  });

  it('activates a row and marks it as the active one', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Activate Fun one' }));
    expect(
      screen.getByRole('button', { name: 'Active: Fun one' }).getAttribute('aria-pressed'),
    ).toBe('true');
    expect(screen.getByRole('button', { name: 'Activate Hello there' })).toBeTruthy();
    const current = rows().filter((row) => row.getAttribute('aria-current') === 'true');
    expect(current.map((row) => row.getAttribute('aria-label'))).toEqual(['Fun one']);
  });

  it('toggles useInCycle with the heart', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Add Hello there to cycle' }));
    expect(screen.getByRole('button', { name: 'Remove Hello there from cycle' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Remove Fun two from cycle' }));
    expect(screen.getByRole('button', { name: 'Add Fun two to cycle' })).toBeTruthy();
  });

  it('filters rows by the selected group', () => {
    renderPage();
    expect(rows()).toHaveLength(3);
    const filter = screen.getByRole<HTMLSelectElement>('combobox', { name: 'Filter by group' });
    fireEvent.change(filter, { target: { value: 'g:Fun' } });
    expect(rows()).toHaveLength(2);
    expect(screen.queryByText('Hello there')).toBeNull();
    fireEvent.change(filter, { target: { value: 'g:' } });
    expect(rows()).toHaveLength(1);
    expect(screen.getByText('Hello there')).toBeTruthy();
  });

  it('shows the character counter and the over-limit hint', () => {
    renderPage();
    expect(screen.getByText('0/140')).toBeTruthy();
    const input = screen.getByRole('textbox', { name: 'New status' });
    fireEvent.change(input, { target: { value: 'abcde' } });
    expect(screen.getByText('5/140')).toBeTruthy();
    fireEvent.change(input, { target: { value: 'x'.repeat(143) } });
    expect(screen.getByText('143/140')).toBeTruthy();
    expect(
      screen.getByText("You're soaring past the 140 char limit by 3. Reign in that message!"),
    ).toBeTruthy();
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Create' }).disabled).toBe(true);
  });

  it('saves an inline edit on Enter and cancels on Escape', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Edit Hello there' }));
    const edit = screen.getByRole('textbox', { name: 'Edit status text' });
    fireEvent.change(edit, { target: { value: 'Hello edited' } });
    fireEvent.keyDown(edit, { key: 'Enter' });
    expect(screen.getByText('Hello edited')).toBeTruthy();
    expect(screen.queryByRole('textbox', { name: 'Edit status text' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Edit Hello edited' }));
    const again = screen.getByRole('textbox', { name: 'Edit status text' });
    fireEvent.change(again, { target: { value: 'discarded' } });
    fireEvent.keyDown(again, { key: 'Escape' });
    expect(screen.getByText('Hello edited')).toBeTruthy();
    expect(screen.queryByText('discarded')).toBeNull();
  });

  it('changes a row group and offers the new group in the filter', () => {
    renderPage();
    const newGroup = screen.getByRole('textbox', { name: 'New group name' });
    fireEvent.change(newGroup, { target: { value: 'Night' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add group' }));
    // No row selected: the filter jumps to the (still empty) new group.
    expect(rows()).toHaveLength(0);
    const filter = screen.getByRole<HTMLSelectElement>('combobox', { name: 'Filter by group' });
    expect(filter.value).toBe('g:Night');
    fireEvent.change(screen.getByRole('textbox', { name: 'New status' }), {
      target: { value: 'Late' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));
    expect(rows()).toHaveLength(1);
    const rowGroup = screen.getByRole<HTMLSelectElement>('combobox', { name: 'Group of Late' });
    expect(rowGroup.value).toBe('Night');
    fireEvent.change(rowGroup, { target: { value: 'Fun' } });
    expect(rows()).toHaveLength(0);
  });

  it('binds the Auto cycle switch and updates the message bar', () => {
    renderPage();
    expect(screen.getByRole('status').textContent).toContain('1 status marked with 💛');
    fireEvent.click(screen.getByRole('switch', { name: 'Auto cycle' }));
    expect(screen.getByRole('switch', { name: 'Auto cycle' }).getAttribute('aria-checked')).toBe(
      'true',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Add Hello there to cycle' }));
    expect(screen.getByRole('status').textContent).toBe('2 statuses take turns every 5 seconds.');
  });
});
