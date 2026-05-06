import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "node:async_hooks": path.resolve(__dirname, "src/lib/empty-shim.ts"),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  }
});
