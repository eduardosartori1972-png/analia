import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  {
    rules: {
      // En el servidor permitimos console.error/warn; el resto, a revisar.
      "no-console": ["warn", { allow: ["error", "warn"] }],
      eqeqeq: ["error", "smart"],
      "prefer-const": "error",
    },
  },
  {
    // Los scripts de CI corren en Node y hablan por consola: ahí sí se permite.
    files: ["scripts/**/*.mjs"],
    rules: {
      "no-console": "off",
    },
  },
  {
    // Los tests informan resultados por consola.
    files: ["tests/**/*.ts"],
    rules: {
      "no-console": "off",
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "coverage/**", "next-env.d.ts"]),
]);
