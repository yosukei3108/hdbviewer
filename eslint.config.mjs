import typescriptEslint from "typescript-eslint";
import js from "@eslint/js";
import globals from "globals";


export default [{
    files: ["**/*.ts"],
}, {
    plugins: {
        "@typescript-eslint": typescriptEslint.plugin,
    },

    languageOptions: {
        parser: typescriptEslint.parser,
        ecmaVersion: 2022,
        sourceType: "module",
    },

    rules: {
        "@typescript-eslint/naming-convention": ["warn", {
            selector: "import",
            format: ["camelCase", "PascalCase"],
        }],

        curly: "warn",
        eqeqeq: "warn",
        "no-throw-literal": "warn",
        semi: "warn",
    },
}, {
    files: ["media/**/*.js"],
    ...js.configs.recommended,
    languageOptions: {
        ecmaVersion: 2022,
        sourceType: "script",
        globals: {
            ...globals.browser,
            acquireVsCodeApi: "readonly",
        },
    },
    rules: {
        ...js.configs.recommended.rules,
        curly: "warn",
        eqeqeq: "warn",
        semi: "warn",
    },
}];