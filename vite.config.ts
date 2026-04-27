import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    strictPort: true,
    port: 5173,
    proxy: {
      "/api": "http://localhost:8787"
    }
  },
  envPrefix: ["VITE_", "TAURI_"],
  build: {
    target: "es2020"
  }
});
