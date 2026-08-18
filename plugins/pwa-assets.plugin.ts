import fs from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";

/**
 * Gera /asset-list.json no build final com os caminhos dos assets JS/CSS emitidos.
 * O service worker consome esse arquivo no install para fazer pre-cache
 * dos bundles com hash — garantindo que o app carregue offline na primeira abertura.
 */
export function pwaAssetsPlugin(): Plugin {
  return {
    name: "pwa-assets-list",
    closeBundle() {
      // outDir é client/... — o build escreve em /dist; gerar o JSON lá também.
      const root = process.cwd();
      const outDir = path.resolve(root, "dist");
      const clientOutDir = path.resolve(root, "client", "dist");
      const target = fs.existsSync(outDir) ? outDir : clientOutDir;
      if (!fs.existsSync(target)) return;

      const assets: string[] = [];
      const assetsDir = path.join(target, "assets");
      const walk = (dir: string) => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            walk(full);
          } else if (entry.name.match(/\.(js|css)$/)) {
            assets.push(path.relative(target, full).replace(/\\/g, "/"));
          }
        }
      };
      if (fs.existsSync(assetsDir)) walk(assetsDir);
      const rel = assets.map(a => `/${a}`);
      // Versão também no client/public para servir no desenvolvimento
      fs.writeFileSync(path.resolve(target, "asset-list.json"), JSON.stringify(rel));
      fs.writeFileSync(path.resolve(root, "client", "public", "asset-list.json"), JSON.stringify(rel));
      console.log(`[pwa-assets-list] ${rel.length} assets escritos em asset-list.json`);
    },
  };
}
