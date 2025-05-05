import UnoCSS from "unocss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  base: "/.within.website/x/cmd/sisyphus/static/",
  plugins: [UnoCSS()],
  build: {
    outDir: "../../web/static",
    emptyOutDir: true,
    sourcemap: true,
  },
});
