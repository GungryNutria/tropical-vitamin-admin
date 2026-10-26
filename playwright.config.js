import { defineConfig, devices } from '@playwright/test';

// El admin se prueba con la API simulada (page.route en e2e/fixtures/mockApi.js): nunca contra producción.
const PORT = Number(process.env.E2E_PORT) || 5188;

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.js',
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    viewport: { width: 1440, height: 900 },
    ...devices['Desktop Chrome'],
  },
  projects: [{ name: 'chromium', use: { viewport: { width: 1440, height: 900 } } }],
  webServer: {
    command: `npx vite --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 60_000,
    env: { VITE_API_URL: 'http://api.test' },
  },
});
