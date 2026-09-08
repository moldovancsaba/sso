import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { FlatCompat } from '@eslint/eslintrc'
import gdsConfig from '@sovereignsquad/gds-eslint-config'

const compat = new FlatCompat({
  baseDirectory: dirname(fileURLToPath(import.meta.url)),
})

const config = [
  {
    ignores: [
      '.next/**',
      'coverage/**',
      'node_modules/**',
      'out/**',
      'build/**',
    ],
  },
  ...compat.extends('next/core-web-vitals'),
  ...gdsConfig,
  {
    files: ['pages/api/**/*.js', 'pages/docs/examples/vanilla.js'],
    rules: {
      'gds/no-raw-design-values': 'off',
    },
  },
  {
    // WHAT: Test files are not feature UI code, so hex literals here are test data (fixture
    //       colors passed to a validator under test), never a styling value bypassing GDS
    //       tokens - the rule's own stated purpose ("feature UI code") does not apply.
    // WHY: __tests__/oauth-client-branding-*.test.js (moldovancsaba/sso#97) exercises hex
    //      color validation and WCAG contrast checking directly, which requires real hex
    //      string literals as inputs.
    files: ['__tests__/**/*.js'],
    rules: {
      'gds/no-raw-design-values': 'off',
    },
  },
]

export default config
