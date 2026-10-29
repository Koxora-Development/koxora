import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import hooks from 'eslint-plugin-react-hooks';
import refresh from 'eslint-plugin-react-refresh';
import i18next from 'eslint-plugin-i18next';
export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/dist-*/**',
      '**/target/**',
      '**/node_modules/**',
      'playwright-report/**',
      'test-results/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { languageOptions: { globals: { ...globals.browser, ...globals.node } } },
  {
    // The language module of the website container runs in njs, which has no
    // optional catch binding, so a defensive catch has to name a parameter it
    // does not use. Everything else in the file is checked as usual.
    files: ['apps/website/src/nginx/*.js'],
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { caughtErrors: 'none' }],
    },
  },
  {
    files: ['**/*.{tsx,jsx}'],
    plugins: { 'react-hooks': hooks, 'react-refresh': refresh, i18next },
    rules: {
      ...hooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'error',
        { allowConstantExport: true },
      ],
      'i18next/no-literal-string': [
        'error',
        {
          markupOnly: true,
          'jsx-attributes': {
            exclude: [
              'className',
              'id',
              'type',
              'value',
              'name',
              'role',
              'href',
              'aria-hidden',
              'data-testid',
            ],
          },
        },
      ],
    },
  },
);
