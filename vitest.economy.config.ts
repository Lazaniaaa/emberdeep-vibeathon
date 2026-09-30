import { defineConfig } from 'vitest/config'

// Used only by `npm run economy`; the normal `npm test` never picks up scripts/economy-report.ts.
export default defineConfig({
  test: { include: ['scripts/economy-report.ts'], testTimeout: 600_000 },
})
