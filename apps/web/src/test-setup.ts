import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Testing Library only auto-cleans when the runner exposes globals; vitest here does not.
afterEach(() => {
  cleanup();
});
