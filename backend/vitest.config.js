import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./test/setup-env.js"],
    include: ["test/**/*.test.js"],
    clearMocks: true
  }
});
