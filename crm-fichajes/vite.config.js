// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"), // 👈 ahora puedes usar "@/context/..."
    },
    dedupe: ["react", "react-dom"], // 👈 evita cargar React dos veces
  },
  server: {
    port: 5173, // opcional, puedes cambiarlo si necesitas
  },
});
