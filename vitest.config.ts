import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    // デフォルト除外(**/node_modules/** 等)を上書きせず追加する
    exclude: [...configDefaults.exclude, ".direnv/**", ".claude/**"],
    setupFiles: ["./src/test-setup.ts"],
  },
});
