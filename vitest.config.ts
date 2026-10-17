import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
    testTimeout: 30000,
    coverage: {
      provider: 'v8',
      include: ['src/lib/**/*.ts'],
      reporter: ['text-summary', 'text', 'json-summary'],
      thresholds: {
        'src/lib/payloads/**': { lines: 95 },
        'src/lib/validate/**': { lines: 95 },
      },
    },
  },
});
