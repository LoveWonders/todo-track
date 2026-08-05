import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const CSP = [
  "default-src 'self' blob: data:",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "connect-src 'self'",
  "worker-src 'self'",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

const injectCsp = () => ({
  name: 'inject-csp',
  apply: 'build',
  transformIndexHtml(html) {
    const tag = `<meta http-equiv="Content-Security-Policy" content="${CSP}">`;
    return html.replace('</head>', `${tag}\n  </head>`);
  },
});

export default defineConfig({
  build: {
    outDir: 'docs',
  },
  plugins: [
    react(),
    injectCsp(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: '待办 - TodoTrack',
        short_name: '待办',
        description: 'TodoTrack - 待办事项管理',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico,json}'],
      },
    }),
  ],
  server: {
    allowedHosts: ['.monkeycode-ai.online'],
  },
})
