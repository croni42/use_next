import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The browser only talks to the Vite origin; /api is proxied to use-back. Same origin keeps the
// SameSite=Strict session cookie working in development. Secure cookies are accepted by browsers
// on http://localhost (a "potentially trustworthy" origin).
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
});
