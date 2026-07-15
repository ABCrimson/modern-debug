# API reference

Generated from the published type declarations (`dist/*.d.ts`, isolatedDeclarations output).
`.` and `/compat` ship their real declarations in content-hashed chunk files whose name
changes every build (`dist/index-<hash>.d.ts`, `dist/compat-<hash>.d.ts`); `resolve-dts.mjs`
runs before this site builds and copies the current chunk for each into
`.vitepress/cache/api-dts/` so the includes below stay correct across builds.

## `modern-debug`

<<< ../.vitepress/cache/api-dts/index.d.ts

## `modern-debug/otel`

<<< ../../packages/modern-debug/dist/otel.d.ts

## `modern-debug/node`

<<< ../../packages/modern-debug/dist/node.d.ts

## `modern-debug/compat`

The full `debug` 4.4.3 surface. Its behavior contract is the golden differential suite;
the shape:

<<< ../.vitepress/cache/api-dts/compat.d.ts
