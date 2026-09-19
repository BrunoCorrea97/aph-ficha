import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "Ficha APH — Calculadora e Relatório",
        short_name: "Ficha APH",
        description: "Fluxograma de triagem, sinais vitais e gerador de relatório de atendimento pré-hospitalar.",
        theme_color: "#0d151c",
        background_color: "#0d151c",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        icons: [
          { src: "pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512.png", sizes: "512x512", type: "image/png" },
          { src: "pwa-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,wasm,gz}"],
        navigateFallback: "/index.html",
        // Os arquivos do motor de OCR (Tesseract.js) passam do limite
        // padrão de 2 MiB — sobem esse teto pra garantir que fiquem em
        // cache e funcionem offline após o primeiro uso.
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024
      }
    })
  ]
});
