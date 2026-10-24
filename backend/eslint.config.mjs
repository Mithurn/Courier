import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/', 'node_modules/', 'prisma/migrations/'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: globals.node },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    // Express's documented way to add fields to Request is a global namespace augmentation.
    files: ['src/auth/middleware.ts'],
    rules: { '@typescript-eslint/no-namespace': 'off' },
  },
  {
    // Test helpers return parsed JSON of unknown shape.
    files: ['test/**'],
    rules: { '@typescript-eslint/no-explicit-any': 'off' },
  },
);
