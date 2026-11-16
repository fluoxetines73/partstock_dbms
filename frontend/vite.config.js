import { defineConfig } from 'vite';

// Same-origin API calls; no secret is injected into the browser bundle.
export default defineConfig({
  server: { proxy: { '/api': process.env.API_TARGET || 'http://127.0.0.1:3000' } },
});
