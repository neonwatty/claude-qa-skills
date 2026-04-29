import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.mjs"],
    setupFiles: ["tests/setup.mjs"],
    // Tests that write to PLAYWRIGHT_CLI_HOME/sites.json must not run
    // concurrently with tests that read loadSites() across file boundaries.
    fileParallelism: false,
  },
});
