import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Local dev and plain builds serve from "/". The GitHub Pages workflow sets
// BASE_PATH to "/<repo-name>/" because project sites live under a sub-path.
const base = process.env.BASE_PATH ?? '/'

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon.png'],
      manifest: {
        name: 'Family Tree',
        short_name: 'Family Tree',
        description: 'Build and visualize your family tree.',
        theme_color: '#5b3ccf',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: base,
        scope: base,
        // Relative (no leading slash): resolved against the manifest's own URL,
        // so they stay correct under a sub-path. "/icons/..." would point at the
        // site root and 404 on Pages.
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
      },
    }),
  ],
})
