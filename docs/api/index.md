# API reference

Generated from the published type declarations (`dist/*.d.ts`, isolatedDeclarations output).
`.` and `/compat` ship their real declarations in content-hashed chunk files whose name
changes every build (`dist/index-<hash>.d.ts`, `dist/compat-<hash>.d.ts`); `resolve-dts.mjs`
runs before this site builds (and before `dev`), copies the current chunk for each into
`.vitepress/cache/api-dts/`, replaces the minifier alias export list with the public export
line, and rewrites `/node`'s chunk import to the package name, so the includes below show
public names only and stay correct across builds.

## `modern-debug`

<<< ../.vitepress/cache/api-dts/index.d.ts

## `modern-debug/otel`

<<< ../../packages/modern-debug/dist/otel.d.ts

## `modern-debug/node`

<<< ../.vitepress/cache/api-dts/node.d.ts

## `modern-debug/compat`

The full `debug` 4.4.3 surface. Its behavior contract is the golden differential suite;
the shape:

<<< ../.vitepress/cache/api-dts/compat.d.ts
