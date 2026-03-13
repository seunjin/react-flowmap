import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist', 'coverage', 'eslint.config.mjs'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.nodeBuiltin,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
        },
      ],
    },
  },
  {
    files: ['src/core/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['../../ui/*', '../ui/*', 'src/ui/*'],
              message: 'Core layer must not depend on UI.',
            },
            {
              group: ['../../runtime/*', '../runtime/*', 'src/runtime/*'],
              message: 'Core layer must not depend on runtime collectors.',
            },
            {
              group: ['../../static/*', '../static/*', 'src/static/*'],
              message: 'Core layer must not depend on static metadata loaders.',
            },
          ],
        },
      ],
    },
  }
);
