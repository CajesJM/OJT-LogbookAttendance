import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [
          ['@babel/plugin-transform-react-jsx', { runtime: 'automatic' }],
        ],
      },
    }),
    {
      name: 'html-transform',
      transformIndexHtml(html) {
        // Remove pdf-vendor preload - it should be lazy loaded only when needed
        return html.replace(
          /<link rel="modulepreload"[^>]*pdf-vendor[^>]*>\s*/g,
          ''
        );
      },
    },
  ],
  build: {
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        passes: 3,
        unsafe: true,
        unsafe_comps: true,
        unsafe_math: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.warn'],
      },
      mangle: {
        safari10: true,
      },
      format: {
        comments: false,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            // React and React-DOM together
            if (id.includes('react') || id.includes('react-dom') || id.includes('scheduler')) {
              return 'react-vendor';
            }
            // jsPDF and html2canvas
            if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('dompurify') || id.includes('purify')) {
              return 'pdf-vendor';
            }
            // Lucide icons
            if (id.includes('lucide-react')) {
              return 'icons-vendor';
            }
            // All other dependencies
            return 'vendor';
          }
        },
        // Optimize chunk loading
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
    chunkSizeWarningLimit: 1000,
    cssCodeSplit: true,
    cssMinify: true,
    sourcemap: false,
    reportCompressedSize: false,
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
    exclude: ['jspdf'],
  },
  server: {
    host: '127.0.0.1',
  },
});
