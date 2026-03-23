import globals from "globals";
import pluginJs from "@eslint/js";
import pluginReact from "eslint-plugin-react";

export default [
  {
    files: ["**/*.{js,mjs,cjs,jsx}"],
    ignores: ["node_modules/**", "public/**", "dist/**", "build/**", ".eslintignore", "eslint.config.js", "src/dataconnect-generated/**"],
  },
  {
    files: ["src/**/*.{js,jsx}"],
    plugins: { 
      react: pluginReact, 
    },
    languageOptions: { 
      parserOptions: { 
        ecmaFeatures: { 
          jsx: true, 
        }, 
      }, 
      globals: { 
        ...globals.browser, 
      }, 
    },
    rules: {
        "react/jsx-uses-react": "error",
        "react/jsx-uses-vars": "error",
    }
  },
  {
    files: ["functions/index.js"],
    languageOptions: {
      globals: {
        ...globals.node,
      }
    }
  },
  pluginJs.configs.recommended,
];
