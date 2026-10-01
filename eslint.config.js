import js from '@eslint/js';
import globals from 'globals';

export default [
    { ignores: ['node_modules/', 'public/assets/css/', 'design/'] },
    js.configs.recommended,
    {
        rules: {
            'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
            eqeqeq: ['error', 'always', { null: 'ignore' }],
            'prefer-const': 'error',
            'no-var': 'error',
        },
    },
    {
        files: ['server/**/*.js', 'scripts/**/*.js', 'tests/**/*.js', '*.config.js'],
        languageOptions: { globals: globals.node },
    },
    {
        files: ['public/**/*.js'],
        languageOptions: { globals: globals.browser },
    },
];
