import { defineConfig, devices } from "@playwright/test";

const origin = process.env.DEMO_BASE_URL;
const channel = process.env.PLAYWRIGHT_CHROME_CHANNEL;
export default defineConfig({
  testDir: "../e2e",
  use: {
    baseURL: origin ?? "http://127.0.0.1:4173",
    trace: "retain-on-failure",
    channel,
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 900 } } },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } },
    },
  ],
  webServer: origin
    ? undefined
    : [
        {
          command: "node scripts/run-python.mjs -m api.chat",
          port: 8765,
          cwd: "..",
        },
        {
          command: "npm run preview -- --port 4173 --strictPort",
          port: 4173,
          cwd: "..",
        },
      ],
});
