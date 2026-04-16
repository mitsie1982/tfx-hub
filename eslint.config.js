// eslint.config.js
import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";
import typescriptPlugin from "@typescript-eslint/eslint-plugin";
import typescriptParser from "@typescript-eslint/parser";

const compat = new FlatCompat();

export default [
  ...compat.config({
    extends: ["@react-native-community", "eslint:recommended"],
    plugins: ["@typescript-eslint"],
    parser: "@typescript-eslint/parser",
    rules: {
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-restricted-syntax": [
        "error",
        {
          selector: "Literal[value='Contractor']",
          message: "Use 'CCMS' instead of 'Contractor' (per naming convention)",
        },
        {
          selector: "Literal[value='Association']",
          message: "Use 'AMMS' instead of 'Association' (per naming convention)",
        },
      ],
    },
  }),
  js.configs.recommended,
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: typescriptParser,
    },
    plugins: {
      "@typescript-eslint": typescriptPlugin,
    },
    rules: {
      ...typescriptPlugin.configs.recommended.rules,
    },
  },
];
