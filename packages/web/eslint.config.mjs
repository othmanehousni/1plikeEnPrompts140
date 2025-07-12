import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: ["components/animate-ui/**/*"],
  },
  {
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
      "@next/next/no-sync-scripts": "off",
      "@next/next/no-img-element": "warn",
      "prefer-const": "off",
    },
  },
];

export default eslintConfig;
