// eslint.config.js
const eslint = require("@eslint/js");
const globals = require("globals");

module.exports = [
  eslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "commonjs",
      globals: {
        ...globals.node,
      },
    },
    rules: {
      indent: ["error", 2],
      "linebreak-style": ["error", "unix"],
      quotes: ["error", "single"],
      semi: ["error", "always"],
      "no-unused-vars": ["warn"],
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
    ignores: ["node_modules/**", "dist/**", "coverage/**"],
  },
];
