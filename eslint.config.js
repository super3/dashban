// ESLint flat config for Dashban.
//
// The app is plain browser JavaScript loaded via <script> tags (no build step),
// so source files are scripts that share a set of browser/CDN globals. Tests run
// under Jest (CommonJS + jsdom).
const js = require('@eslint/js');

const browserGlobals = {
    window: 'readonly',
    document: 'readonly',
    console: 'readonly',
    localStorage: 'readonly',
    fetch: 'readonly',
    setTimeout: 'readonly',
    clearTimeout: 'readonly',
    setInterval: 'readonly',
    clearInterval: 'readonly',
    requestAnimationFrame: 'readonly',
    navigator: 'readonly',
    location: 'readonly',
    history: 'readonly',
    alert: 'readonly',
    confirm: 'readonly',
    Image: 'readonly',
    DOMParser: 'readonly',
    FormData: 'readonly',
    Event: 'readonly',
    CustomEvent: 'readonly',
    MouseEvent: 'readonly',
    URL: 'readonly',
    btoa: 'readonly',
    atob: 'readonly',
    // CDN libraries loaded before the app scripts
    Sortable: 'readonly',
    markdownit: 'readonly',
    DOMPurify: 'readonly',
    // Utilities exposed on the global scope by src/utils.js
    GitHubUtils: 'readonly',
    // Dual browser/Node export guards reference these
    module: 'writable',
    globalThis: 'readonly',
    // Present only under Jest; referenced by test-environment guards
    jest: 'readonly'
};

module.exports = [
    js.configs.recommended,
    {
        files: ['src/**/*.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'script',
            globals: browserGlobals
        },
        rules: {
            // Unused function arguments are common in DOM/event callbacks.
            'no-unused-vars': ['warn', { args: 'none' }]
        }
    },
    {
        files: ['tests/**/*.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'commonjs',
            globals: {
                ...browserGlobals,
                require: 'readonly',
                module: 'writable',
                global: 'writable',
                process: 'readonly',
                __dirname: 'readonly',
                Buffer: 'readonly',
                // Globals tests reassign on the jsdom environment
                window: 'writable',
                localStorage: 'writable',
                fetch: 'writable',
                navigator: 'writable',
                alert: 'writable',
                confirm: 'writable',
                Sortable: 'writable',
                Storage: 'readonly',
                // jsdom DOM globals used directly in tests
                HTMLElement: 'readonly',
                HTMLCanvasElement: 'readonly',
                Element: 'readonly',
                Node: 'readonly',
                FormData: 'readonly',
                KeyboardEvent: 'readonly',
                // Global the kanban module attaches its test API to
                kanbanTestExports: 'writable',
                // Jest test API
                describe: 'readonly',
                test: 'readonly',
                it: 'readonly',
                expect: 'readonly',
                beforeEach: 'readonly',
                afterEach: 'readonly',
                beforeAll: 'readonly',
                afterAll: 'readonly'
            }
        },
        rules: {
            // Tests intentionally keep some unused bindings and empty blocks.
            'no-unused-vars': 'off',
            'no-empty': 'off'
        }
    },
    {
        // Generated/coverage output and dependencies are not linted.
        ignores: ['coverage/**', 'node_modules/**']
    }
];
