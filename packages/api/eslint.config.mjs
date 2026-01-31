import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import rootConfig from '../../eslint.config.mjs';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(...rootConfig, {
  files: ['src/**/*.ts'],
  languageOptions: {
    parser: tsParser,
    parserOptions: {
      project: './tsconfig.json',
    },
    globals: {
      ...globals.node,
    },
  },
  plugins: {},
  rules: {
    ...js.configs.recommended.rules,
    ...tsPlugin.configs.recommended.rules,
    ...tsPlugin.configs['recommended-requiring-type-checking'].rules,
    // Relaxed rules for Express route handlers
    '@typescript-eslint/no-misused-promises': ['error', {
      checksVoidReturn: {
        arguments: false, // Allow async functions as Express handlers
      },
    }],
    '@typescript-eslint/no-unsafe-assignment': 'warn',
    '@typescript-eslint/no-unsafe-member-access': 'warn',
    '@typescript-eslint/no-unsafe-argument': 'warn',
    '@typescript-eslint/no-unsafe-call': 'warn',
    '@typescript-eslint/no-explicit-any': 'warn',
  },
});
