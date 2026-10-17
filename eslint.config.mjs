import tsParser from "@typescript-eslint/parser";
import remotionPlugin from "@remotion/eslint-plugin";

export default [
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      "@remotion": remotionPlugin,
    },
    rules: {
      ...remotionPlugin.configs.recommended.rules,
      "@remotion/deterministic-randomness": "error",
    },
  },
];
