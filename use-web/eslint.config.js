import js from '@eslint/js';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

// Security-relevant rules for hand-written code (FR-14, FR-15, FR-02, FR-03, FR-09, FR-17).
// The generated client in src/api is excluded (ADR-010).
const unsafeDomSinks = [
  {
    selector:
      'AssignmentExpression[left.property.name=/^(innerHTML|outerHTML)$/]',
    message:
      'Do not assign innerHTML/outerHTML; render through React or a dedicated sanitisation component (FR-15, FR-16).',
  },
  {
    selector:
      'CallExpression[callee.property.name=/^(write|writeln|insertAdjacentHTML)$/]',
    message: 'Do not use document.write/writeln or insertAdjacentHTML (FR-15).',
  },
];

const httpGlobals = ['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource'].map(
  (name) => ({
    name,
    message:
      'HTTP access belongs in the communication layer (src/api-client.ts) (FR-02, FR-03, FR-09).',
  }),
);

export default tseslint.config(
  { ignores: ['dist', 'src/api/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { react, 'react-hooks': reactHooks },
    settings: { react: { version: 'detect' } },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react/no-danger': 'error',
      'react/no-danger-with-children': 'error',
      'react/jsx-no-script-url': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',
      'no-restricted-syntax': ['error', ...unsafeDomSinks],
      'no-restricted-globals': ['error', ...httpGlobals],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/api', '**/api/*'],
              message:
                'Import the generated client only in src/api-client.ts; everything else uses api-client (FR-01, FR-02, FR-03).',
            },
          ],
        },
      ],
    },
  },
  {
    // The communication layer is the one place that talks to the generated client.
    files: ['src/api-client.ts'],
    rules: { 'no-restricted-imports': 'off', 'no-restricted-globals': 'off' },
  },
);
