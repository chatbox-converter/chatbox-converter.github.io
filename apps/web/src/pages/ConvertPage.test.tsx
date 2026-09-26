import { createDefaultProfile, nativeCodec } from '@chatbox-converter/core';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ConvertPage } from '@/pages/ConvertPage';
import { ProfileProvider } from '@/state/ProfileProvider';

describe('ConvertPage', () => {
  it('imports a native profile and offers to load it', async () => {
    const profile = createDefaultProfile({
      meta: { name: 'Imported one', source: null, notes: [] },
    });
    const [file] = nativeCodec.serialize(profile).files;
    if (file === undefined) {
      throw new Error('native codec produced no file');
    }
    render(
      <ProfileProvider initial={createDefaultProfile()}>
        <ConvertPage />
      </ProfileProvider>,
    );
    const input = screen.getByLabelText('Pick config files');
    const blob = new File([file.content], 'chatbox-profile.json', { type: 'application/json' });
    fireEvent.change(input, { target: { files: [blob] } });
    await waitFor(() => {
      expect(screen.getByText('Load into the editor')).toBeTruthy();
    });
    expect(screen.getByText(/2 integrations, 1 statuses/)).toBeTruthy();
  });

  it('reports unreadable input', async () => {
    render(
      <ProfileProvider initial={createDefaultProfile()}>
        <ConvertPage />
      </ProfileProvider>,
    );
    const input = screen.getByLabelText('Pick config files');
    fireEvent.change(input, {
      target: { files: [new File(['not json'], 'weird.json', { type: 'application/json' })] },
    });
    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toMatch(/recognised|valid/i);
    });
  });

  it('exports the current profile', () => {
    const createObjectURL = vi.fn(() => 'blob:x');
    const revokeObjectURL = vi.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    render(
      <ProfileProvider initial={createDefaultProfile()}>
        <ConvertPage />
      </ProfileProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: /Chatbox Converter profile/ }));
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/1 file downloaded/)).toBeTruthy();
  });
});
