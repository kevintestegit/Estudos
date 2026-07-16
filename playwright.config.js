const { defineConfig } = require("@playwright/test");
const port = process.env.PLAYWRIGHT_PORT || "3050";

module.exports = defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.js",
  timeout: 20_000,
  fullyParallel: false,
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    browserName: "chromium",
    launchOptions: process.env.CI
      ? {}
      : { executablePath: "/snap/bin/chromium" },
    viewport: { width: 1280, height: 800 },
  },
  webServer: {
    command: `python3 -m http.server ${port} --directory .`,
    url: `http://127.0.0.1:${port}/hoje.html`,
    reuseExistingServer: true,
  },
});
