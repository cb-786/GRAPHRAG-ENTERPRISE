import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",   // required inside Docker
    port: 5173,
    // HMR websocket must point back to the host, not the container
    hmr: { clientPort: 80 },
    proxy: {
      "/api": {
        target: process.env.VITE_BACKEND_URL || "http://backend:8000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});