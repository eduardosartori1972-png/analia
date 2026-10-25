import { fileURLToPath } from "node:url";

import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig(({ mode }) => {
  // Vitest no vuelca .env.local en process.env: Vite solo lo expone en
  // `import.meta.env` y únicamente para variables con el prefijo configurado.
  // Sin esto, `ANALYZE_LIVE=1 pnpm test` correría las evals contra el fake
  // aunque .env.local tenga DeepSeek configurado.
  //
  // El entorno del shell tiene prioridad: el archivo solo completa lo que falta.
  const fileEnv = loadEnv(mode, process.cwd(), "ANALYZE_");
  for (const [key, value] of Object.entries(fileEnv)) {
    if (key.startsWith("ANALYZE_")) process.env[key] ??= value;
  }

  return {
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./", import.meta.url)),
      },
    },
    test: {
      environment: "node",
      include: ["tests/**/*.test.ts"],
    },
  };
});
