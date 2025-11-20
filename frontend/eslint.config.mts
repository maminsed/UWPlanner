import js from '@eslint/js';
import next from '@next/eslint-plugin-next';
import { defineConfig } from 'eslint/config';
import importPlugin from 'eslint-plugin-import';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import unusedImports from 'eslint-plugin-unused-imports';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
  {
    ignores: ['**/node_modules/**', '**/build/**', '**/.next/**'],
  },
  {
    files: ['**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    ignores: ['node_modules/', 'build/', '.next/'],
    plugins: {
      react,
      'react-hooks': reactHooks,
      import: importPlugin,
      'unused-imports': unusedImports,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      '@next/next': next as any, // Next.js plugin
    },
    settings: {
      react: { version: 'detect' },
    },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.browser,
    },
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  react.configs.flat.recommended,
  {
    rules: {
      // Prefer TS-aware unused vars; allow _prefixed args/vars for intentional ignores.
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],

      // Clean up unused imports automatically (pairs well with many editors’ auto-fixes)
      'unused-imports/no-unused-imports': 'warn',
      'unused-imports/no-unused-vars': 'off',

      // "eqeqeq": ["error", "smart"], //disabeled for now
      curly: ['error', 'multi-line'],

      'no-console': ['error', { allow: ['warn', 'error', 'info'] }], //TODO: remove info

      // Keep imports tidy and predictable
      'import/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
            'object',
            'type',
          ],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],

      // Modern React (no need to import React for JSX)
      'react/jsx-uses-react': 'off',
      'react/react-in-jsx-scope': 'off',
      // If you use TS instead of PropTypes, turn this off to reduce noise
      'react/prop-types': 'off',

      // React Hooks correctness & dependency hygiene
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'off',

      // ---------- Next.js best practices ----------
      // The plugin ships many rules; here are a few high-signal ones:
      '@next/next/no-img-element': 'error', // use next/image for performance
      '@next/next/no-html-link-for-pages': 'warn', // prefer next/link to <a href="/page">
      '@next/next/no-head-element': 'warn', // prefer next/head or app/layout metadata
      '@next/next/google-font-display': 'warn', // fonts optimization
    },
  },
]);
