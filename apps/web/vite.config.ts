import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { analyzer } from 'vite-bundle-analyzer'
import { sentryVitePlugin } from '@sentry/vite-plugin'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    // Bundle analyzer for performance optimization
    ...(mode === 'analyze' ? [analyzer({ analyzerMode: 'server', openAnalyzer: true })] : []),
    // Sentry source maps upload (only in production builds)
    ...(mode === 'production' && process.env.SENTRY_AUTH_TOKEN
      ? [
          sentryVitePlugin({
            org: process.env.SENTRY_ORG,
            project: process.env.SENTRY_PROJECT,
            authToken: process.env.SENTRY_AUTH_TOKEN,
            sourcemaps: {
              assets: './dist/**',
              ignore: ['node_modules'],
              filesToDeleteAfterUpload: ['**/*.map'],
            },
            telemetry: false,
          }),
        ]
      : []),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@trakr/shared': path.resolve(__dirname, '../../packages/shared/src'),
      react: path.resolve(__dirname, '../../node_modules/react'),
      'react-dom': path.resolve(__dirname, '../../node_modules/react-dom'),
    },
    dedupe: ['react', 'react-dom'],
  },
  server: {
    port: 3002,
    host: true,
    // SPA fallback - serve index.html for all routes (fixes 404 on refresh)
    strictPort: false,
    fs: {
      // Allow serving files from the shared workspace outside this package root
      allow: [
        // Monorepo shared source
        path.resolve(__dirname, '../../packages/shared/src'),
        // Also allow monorepo root for ancillary files if referenced
        path.resolve(__dirname, '../../'),
      ],
    },
  },
  preview: {
    port: 3002,
    host: true,
    strictPort: false,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    // Ensure proper CSS handling for production
    cssCodeSplit: true,
    // Performance optimizations
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (!id.includes('node_modules')) return undefined
          // Route-isolated heavy libs get their own chunk so they're only
          // fetched when a route that actually uses them is visited —
          // previously everything below was force-merged into one eager
          // ~8.7MB 'vendor' chunk loaded on every page. Everything else
          // (react, supabase-js, date-fns, sentry, etc.) falls through to
          // Rollup's default per-entry-point chunking, return undefined.
          if (id.includes('ag-grid')) return 'ag-grid'
          if (id.includes('plotly')) return 'plotly'
          if (id.includes('jspdf') || id.includes('exceljs')) return 'export-libs'
          if (id.includes('recharts')) return 'charts'
          return undefined
        },
        // Ensure consistent asset naming
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
      },
    },
    // Increase chunk size warning limit for better chunking
    chunkSizeWarningLimit: 1000,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    globals: true,
    css: true,
    exclude: ['tests/**/*.spec.ts'],
  },
}))
