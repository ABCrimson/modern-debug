// §8.5 size gates (min+brotli), measured with size-limit's rolldown bundler (preset-small-lib
// 14). `.` measures the §1 pillar: the tree-shaken cost of `import { createDebug }` (1536 B per
// DECISIONS G-10). size-limit ignores the optional peer `@opentelemetry/api` on every check
// because it is a peerDependency; ./node needs the node platform so `node:async_hooks` stays
// external instead of being bundled or failing to resolve.
const nodePlatform = (config) => ({ ...config, platform: 'node' })

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
  },
  {
    name: './node',
    path: 'dist/node.js',
    limit: '448 B',
    modifyRolldownConfig: nodePlatform,
  },
]
