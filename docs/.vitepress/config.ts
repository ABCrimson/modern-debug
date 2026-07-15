import { defineConfig } from 'vitepress'

export default defineConfig({
  // Deployed at https://abcrimson.github.io/modern-debug/ (G-15).
  base: '/modern-debug/',
  title: 'modern-debug',
  description:
    'Sub-2KB universal diagnostic logger: debug-compatible namespaces, structured NDJSON, OpenTelemetry correlation, AsyncLocalStorage scoping.',
  appearance: 'dark',
  cleanUrls: true,
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/quickstart' },
      { text: 'Migration', link: '/guide/migration' },
      { text: 'API', link: '/api/' },
    ],
    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Why modern-debug', link: '/' },
          { text: 'Quickstart', link: '/guide/quickstart' },
          { text: 'Migration from debug', link: '/guide/migration' },
          { text: 'Structured logging', link: '/guide/structured-logging' },
          { text: 'OpenTelemetry', link: '/guide/otel' },
          { text: 'Request scoping', link: '/guide/scoping' },
          { text: 'Runtime matrix', link: '/guide/runtimes' },
          { text: 'Divergence notes', link: '/guide/divergence' },
        ],
      },
      {
        text: 'Reference',
        items: [{ text: 'API reference', link: '/api/' }],
      },
    ],
    outline: { level: [2, 3] },
    footer: {
      message: 'MIT · replaces debug 4.4.3 grammar-compatibly',
    },
  },
})
