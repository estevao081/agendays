import { defineConfig } from '@playwright/test';

const PORT = 4173;

/**
 * Verificação visual em navegador real (Chromium): pega o que o jsdom dos testes
 * de interface não enxerga — elementos cobertos por outros, estouro de largura,
 * menu transparente, layout de impressão. Rode com `npm run test:visual`.
 * (Na 1ª vez: `npx playwright install chromium`.)
 */
export default defineConfig({
  testDir: './e2e',
  // dentro de node_modules/.cache: já é ignorado pelo git
  outputDir: './node_modules/.cache/playwright',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'mobile', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
    { name: 'desktop', use: { viewport: { width: 1280, height: 800 } } },
  ],
  webServer: {
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
