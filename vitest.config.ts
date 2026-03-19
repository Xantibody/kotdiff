import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    exclude: ["node_modules", ".direnv"],
    setupFiles: ["./src/test-setup.ts"],
  },
});
