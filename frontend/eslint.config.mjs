import { defineConfig, globalIgnores } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextCoreWebVitals,
  ...nextTypeScript,
  {
    rules: {
      // Room URLs are read once after browser hydration, and the game design
      // deliberately renders `//` as visual radio/tactical separators.
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-effect": "off",
      "react/jsx-no-comment-textnodes": "off",
    },
  },
  globalIgnores([".next/**", "node_modules/**"]),
]);
