import js from "@eslint/js";
import tseslint from "typescript-eslint";
import a11y from "eslint-plugin-jsx-a11y";
import globals from "globals";
export default tseslint.config(
  { ignores: ["dist", "node_modules"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { languageOptions: { globals: { ...globals.browser, ...globals.node } } },
  {
    files: ["src/**/*.tsx"],
    ...a11y.flatConfigs.recommended,
    rules: {
      ...a11y.flatConfigs.recommended.rules,
      // Named overflow regions must receive keyboard focus so arrow keys can scroll them.
      "jsx-a11y/no-noninteractive-tabindex": [
        "error",
        { roles: ["tabpanel", "region"] },
      ],
    },
  },
);
