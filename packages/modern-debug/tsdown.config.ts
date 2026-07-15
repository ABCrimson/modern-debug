import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    compat: 'src/compat.ts',
    'compat-cjs': 'src/compat-cjs.ts',
    otel: 'src/otel.ts',
    node: 'src/node.ts',
  },
  format: 'esm',
  platform: 'neutral',
  target: 'es2023',
  minify: true,
  dts: { generator: 'oxc' },
  deps: { neverBundle: [/^node:/, '@opentelemetry/api'] },
  // Legacy-TS types for the "." require condition — see src/compat-cjs.d.cts header.
  copy: { from: 'src/compat-cjs.d.cts' },
})
