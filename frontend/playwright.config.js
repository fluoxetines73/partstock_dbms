import { defineConfig } from '@playwright/test';
import { randomBytes } from 'node:crypto';

process.env.E2E_MANAGER_TOKEN ||= randomBytes(32).toString('hex');
export default defineConfig({
  testDir: './tests', workers: 1, fullyParallel: false,
  reporter: 'list', timeout: 20000,
  use: { baseURL: 'http://127.0.0.1:5174', headless: true,
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {},
  },
  webServer: [
    { command: 'node --env-file=../.env.docker ../backend/tests-db/ui-server.cjs', url: 'http://127.0.0.1:3101/ready', reuseExistingServer: false, gracefulShutdown: { signal: 'SIGTERM', timeout: 10000 } },
    { command: 'npm run dev -- --port 5174 --strictPort', url: 'http://127.0.0.1:5174', reuseExistingServer: false, env: { API_TARGET: 'http://127.0.0.1:3101' } },
  ],
});
