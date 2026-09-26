/* eslint-disable no-console -- this is the one place console access is allowed; everything else logs through here. */
export const logger = {
  debug: (...args: unknown[]): void => {
    if (import.meta.env.DEV) {
      console.debug('[chatbox-converter]', ...args);
    }
  },
  info: (...args: unknown[]): void => {
    console.info('[chatbox-converter]', ...args);
  },
  warn: (...args: unknown[]): void => {
    console.warn('[chatbox-converter]', ...args);
  },
  error: (...args: unknown[]): void => {
    console.error('[chatbox-converter]', ...args);
  },
};
