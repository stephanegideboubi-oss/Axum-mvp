import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    // Docker bind mounts on Windows don't reliably deliver filesystem
    // change events, so fall back to polling for live-reload to work.
    watch: {
      usePolling: true,
    },
  },
});
