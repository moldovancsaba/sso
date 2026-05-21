import { dirname } from 'path'
import { fileURLToPath } from 'url'
import { FlatCompat } from '@eslint/eslintrc'

const __dirname = dirname(fileURLToPath(import.meta.url))

const compat = new FlatCompat({
  baseDirectory: __dirname,
})

const config = [
  {
    ignores: [
      '.next/**',
      'coverage/**',
      'node_modules/**',
      'client/dist/**',
      'dist/**',
    ],
  },
  ...compat.extends('next/core-web-vitals'),
  {
    rules: {
      // Content-heavy pages intentionally render prose with apostrophes and quotes.
      'react/no-unescaped-entities': 'off',
    },
  },
  {
    files: ['pages/docs/**/*.js'],
    rules: {
      // Docs pages intentionally use simple content links and inline example text.
      '@next/next/no-html-link-for-pages': 'off',
      'react/jsx-no-comment-textnodes': 'off',
    },
  },
]

export default config
