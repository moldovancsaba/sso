import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { FlatCompat } from '@eslint/eslintrc'
import gdsConfig from '@doneisbetter/gds-eslint-config'

const compat = new FlatCompat({
  baseDirectory: dirname(fileURLToPath(import.meta.url)),
})

const config = [
  {
    ignores: [
      '.next/**',
      'coverage/**',
      'node_modules/**',
      'client/dist/**',
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
]

export default config
