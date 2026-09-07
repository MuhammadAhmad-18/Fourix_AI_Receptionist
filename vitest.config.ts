import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: [{ find: /^next\/server$/, replacement: "next/server.js" }],
  },
  ssr: {
    noExternal: ["next-auth", "next"],
  },
  test: {
    environment: "node",
    globals: true,
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/setup.ts"],
    testTimeout: 20000,
    hookTimeout: 20000,
    // Service tests run against the real dev Postgres (see tests/setup.ts).
    // Mocking Prisma proves nothing about the concurrency/constraint
    // behaviour that matters most for the appointment engine.
    fileParallelism: false,
  },
});
