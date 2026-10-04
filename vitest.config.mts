import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    // Database-backed integration tests run under vitest.integration.config.mts.
    exclude: [...configDefaults.exclude, "**/*.integration.test.ts"],
    restoreMocks: true,
  },
});
