// §8.5 size gates (min+brotli). `.` measures the §1 pillar definition: the tree-shaken cost
// of `import { createDebug }` (1536 B per DECISIONS G-10). Subpath entries need esbuild
// tweaks: ESM output (otel uses top-level await) and node platform (node:async_hooks).
const esm = (config) => {
  config.format = 'esm'
  config.platform = 'node'
  config.external = [...(config.external ?? []), '@opentelemetry/api']
  return config
}

export default [
  {
    name: '. (core, §1 pillar: cost of `import { createDebug }`)',
    path: 'dist/index.js',
    import: '{ createDebug }',
    limit: '1536 B',
  },
  {
    name: './compat',
    path: 'dist/compat.js',
    limit: '1800 B',
  },
  {
    name: './otel',
    path: 'dist/otel.js',
    limit: '512 B',
    modifyEsbuildConfig: esm,
  },
  {
    name: './node',
    path: 'dist/node.js',
    limit: '448 B',
    modifyEsbuildConfig: esm,
  },
]
