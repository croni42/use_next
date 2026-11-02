import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// The browser only talks to the Vite origin; /api is proxied to use-back. Same origin keeps the
// SameSite=Strict session cookie working in development. Secure cookies are accepted by browsers
// on http://localhost (a "potentially trustworthy" origin).
export default defineConfig({
  plugins: [react()],
  build: {
    // The production CSP has no data: source, so assets are never inlined as data URIs.
    assetsInlineLimit: 0,
  },
  test: {
    environment: 'jsdom',
  },
  server: {
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
});
