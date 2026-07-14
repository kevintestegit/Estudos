const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.js",
  timeout: 20_000,
  fullyParallel: false,
  use: {
    baseURL: "http://127.0.0.1:3050",
    browserName: "chromium",
    launchOptions: { executablePath: "/snap/bin/chromium" },
    viewport: { width: 1280, height: 800 },
  },
  webServer: {
    command: "python3 -m http.server 3050 --directory .",
    url: "http://127.0.0.1:3050/hoje.html",
    reuseExistingServer: true,
  },
});
