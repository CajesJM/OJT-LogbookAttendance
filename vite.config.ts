import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "html-transform",
      transformIndexHtml(html) {
        return html.replace(
          /<link rel="modulepreload"[^>]*pdf-vendor[^>]*>\s*/g,
          "",
        );
      },
    },
  ],
  build: {
    target: "esnext",
    minify: "esbuild",
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes("node_modules")) {
            if (
              id.includes("react") ||
              id.includes("react-dom") ||
              id.includes("scheduler")
            ) {
              return "react-vendor";
            }

            if (
              id.includes("jspdf") ||
              id.includes("html2canvas") ||
              id.includes("dompurify") ||
              id.includes("purify")
            ) {
              return "pdf-vendor";
            }

            if (id.includes("lucide-react")) {
              return "icons-vendor";
            }

            return "vendor";
          }
        },

        chunkFileNames: "assets/[name]-[hash].js",
        entryFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
    chunkSizeWarningLimit: 1000,
    cssCodeSplit: true,
    cssMinify: true,
    sourcemap: false,
    reportCompressedSize: false,
  },
  optimizeDeps: {
    include: ["react", "react-dom"],
    exclude: ["jspdf"],
  },
  server: {
    host: "127.0.0.1",
  },
});
