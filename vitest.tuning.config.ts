import { defineConfig } from 'vitest/config'

// Used only by `npm run tuning`; the normal `npm test` never picks up scripts/light-tuning.ts.
export default defineConfig({
  test: { include: ['scripts/light-tuning.ts'], testTimeout: 1_800_000 },
})
