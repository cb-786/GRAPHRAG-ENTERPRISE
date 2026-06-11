import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",   // required inside Docker
    port: 5173,
    // HMR websocket must point back to the host, not the container
    hmr: { clientPort: 80 },
  },
});