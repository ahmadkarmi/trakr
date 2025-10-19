import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { analyzer } from 'vite-bundle-analyzer'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    // Bundle analyzer for performance optimization
    ...(mode === 'analyze' ? [analyzer({ analyzerMode: 'server', openAnalyzer: true })] : []),
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
    // Performance optimizations
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // All node_modules in vendor chunk to avoid circular dependencies
          if (id.includes('node_modules')) {
            // Separate out large chart library
            if (id.includes('recharts')) {
              return 'charts'
            }
            return 'vendor'
          }
        },
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
  },
}))
