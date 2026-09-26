/// <reference types="vite/client" />

import 'react';

// eslint-disable-next-line no-restricted-syntax -- TypeScript module augmentation, not a namespace; there is no ES-module way to extend React's attribute types.
declare module 'react' {
  interface InputHTMLAttributes<T> extends HTMLAttributes<T> {
    /** Directory picker; non-standard but implemented by all current browsers. */
    webkitdirectory?: string;
  }
}
