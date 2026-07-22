import { defineConfig } from 'vitest/config'

// packages/shared holds pure business logic (compliance scoring, date utils).
// It ran no tests in CI before — CI's only unit step is scoped to @trakr/web —
// so scoring had zero coverage and a characterization test dropped here would
// have been collected by nothing. Node environment: no DOM needed.
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts'],
  },
})
