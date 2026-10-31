import { defineConfig } from 'vitepress'

export default defineConfig({
  // Deployed at https://abcrimson.github.io/modern-debug/ (G-15).
  base: '/modern-debug/',
  title: 'modern-debug',
  description:
    'Sub-2KB universal diagnostic logger: debug-compatible namespaces, structured NDJSON, OpenTelemetry correlation, AsyncLocalStorage scoping.',
  appearance: 'dark',
  cleanUrls: true,
  head: [['link', { rel: 'icon', type: 'image/svg+xml', href: '/modern-debug/favicon.svg' }]],
  sitemap: { hostname: 'https://abcrimson.github.io/modern-debug/' },
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/quickstart' },
      { text: 'Migration', link: '/guide/migration' },
      { text: 'Comparison', link: '/guide/comparison' },
      { text: 'API', link: '/api/' },
      { text: 'Roadmap', link: 'https://github.com/ABCrimson/modern-debug/blob/main/ROADMAP.md' },
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
          { text: 'Comparison', link: '/guide/comparison' },
        ],
      },
      {
        text: 'Reference',
        items: [{ text: 'API reference', link: '/api/' }],
      },
    ],
    search: { provider: 'local' },
    socialLinks: [{ icon: 'github', link: 'https://github.com/ABCrimson/modern-debug' }],
    editLink: {
      pattern: 'https://github.com/ABCrimson/modern-debug/edit/main/docs/:path',
    },
    outline: { level: [2, 3] },
    footer: {
      message: 'MIT · replaces debug 4.4.3 grammar-compatibly',
    },
  },
})
