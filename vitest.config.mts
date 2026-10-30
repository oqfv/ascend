import { defineConfig } from "vitest/config";
import path from "node:path";

// Unit tests always run. Database tests (*.db.test.ts) run only with RUN_DB_TESTS=1, against the
// database in .env, using throwaway accounts that they delete afterwards.
const db = process.env.RUN_DB_TESTS === "1";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "server-only": path.resolve(import.meta.dirname, "src/test/empty.ts"),
    },
  },
  test: {
    include: db ? ["src/**/*.db.test.ts"] : ["src/**/*.test.ts"],
    exclude: db ? [] : ["src/**/*.db.test.ts", "node_modules/**"],
    environment: "node",
    setupFiles: db ? ["src/test/load-env.ts"] : [],
    testTimeout: 60_000,
    hookTimeout: 60_000,
    fileParallelism: false,
  },
});
