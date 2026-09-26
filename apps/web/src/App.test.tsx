import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from '@/App';

describe('App', () => {
  it('renders the navigation and the preview', () => {
    render(<App />);
    expect(screen.getByRole('navigation', { name: 'Pages' })).toBeTruthy();
    expect(screen.getByText('PREVIEW')).toBeTruthy();
  });
});
