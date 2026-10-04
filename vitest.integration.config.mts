import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Database-backed integration suite.
 *
 * Uses `MONGODB_TEST_URI` when set; otherwise it starts an in-memory MongoDB
 * for the run. The tests create and drop a temporary database, so a supplied
 * URI must point at an isolated server. Run with:
 *
 *   npm run test:integration
 *   MONGODB_TEST_URI=mongodb://127.0.0.1:27017 npm run test:integration
 *
 * The fast unit/component suite stays in `vitest.config.mts` and never needs
 * a database.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // Allow real server modules to be imported outside Next's runtime.
      "server-only": fileURLToPath(new URL("./src/test/server-only.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.integration.test.ts"],
    setupFiles: ["./src/test/integration/setup.ts"],
    restoreMocks: true,
    // The suite shares one MongoDB server and drops a per-file test database.
    fileParallelism: false,
  },
});
