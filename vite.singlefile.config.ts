import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { viteSingleFile } from "vite-plugin-singlefile";

/**
 * Build separado só pra gerar um único arquivo HTML autocontido —
 * pensado para compartilhar e testar rapidamente (abre direto no Chrome
 * com duplo toque, sem precisar de servidor). Sem plugin de PWA aqui:
 * service worker não funciona em arquivo local (file://), então incluí-lo
 * só geraria erro silencioso no console sem nenhum benefício.
 *
 * Uso: npm run build:singlefile → gera dist-singlefile/index.html
 */
export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile()],
  build: {
    outDir: "dist-singlefile",
    assetsInlineLimit: 100_000_000, // inlinear tudo, inclusive os ícones PNG
  },
});
