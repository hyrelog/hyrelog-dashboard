/**
 * ESLint 10.x + `eslint-config-next@16` pulls `eslint-plugin-react@7.x`, which still expects legacy
 * `context.getFilename()` from ESLint’s rule API. ESLint 10 removed/replaced that helper, which surfaces as
 * `getFilename is not a function` when lint runs.
 *
 * **Mitigations (pick one):** pin `eslint` to the latest 9.x line (aligned with what `typescript-eslint`
 * and many plugins tested against), **or** wait for `eslint-plugin-react` / `eslint-config-next` releases
 * that officially support ESLint 10’s flat-config rule context. Avoid ad-hoc major bumps beyond that pin.
 */
import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts'
  ]),
  {
    rules: {
      // Note: you must disable the base rule as it can report incorrect errors
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'react-hooks/exhaustive-deps': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/rules-of-hooks': 'off',
      'prefer-const': 'off'
    }
  }
]);

export default eslintConfig;
