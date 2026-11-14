import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        include: ["**/*.test.ts"],
        setupFiles: ["./setup.ts"],
        exclude: ["node_modules/**"],
        fileParallelism: false,
        testTimeout: 30_000,
        hookTimeout: 60_000,
    },
});
