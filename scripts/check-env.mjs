#!/usr/bin/env node

/**
 * scripts/check-env.mjs
 *
 * WHAT: Fails when application code reads an environment variable that breaks the naming
 *       convention, or reads an SSO_ variable that .env.example does not document.
 *
 * RULES:
 *   1. A variable this service owns is read as SSO_<NAME> (NEXT_PUBLIC_SSO_<NAME> for
 *      browser-visible ones). Platform variables (NODE_ENV, VERCEL_*, ...) keep their names.
 *   2. While the unprefixed names are still supported, a legacy read is allowed only in the
 *      fallback form on one line: (process.env.SSO_X ?? process.env.X). Literal property
 *      access is required so Edge and client bundles can inline the value.
 *   3. Every SSO_ variable the code reads appears in .env.example (a commented-out line
 *      counts as documented).
 *
 * WHY: names are the only contract between this repository, Vercel and each developer's local
 *      file. This is a names-only check; it never reads an env file or prints a value.
 *
 * Scope: lib/, pages/ (except the consumer examples in pages/docs/), scripts/, tools/,
 *        middleware.js and next.config.js. Tests are excluded on purpose.
 */

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()

const PLATFORM =
  /^(NODE_ENV|CI|PORT|HOSTNAME|TZ|HOME|PATH|DEBUG|NO_COLOR|FORCE_COLOR|NEXT_RUNTIME|NEXT_PHASE|NEXT_TELEMETRY_DISABLED|JEST_WORKER_ID|ANALYZE|VERCEL(_.*)?|NEXT_PUBLIC_VERCEL_.*|GITHUB_.*|RUNNER_.*|npm_.*|NPM_CONFIG_.*|NODE_AUTH_TOKEN|NODE_OPTIONS|AWS_.*|GOOGLE_APPLICATION_CREDENTIALS|SENTRY_.*|OTEL_.*|TURBO_.*|NX_.*)$/

const prefixed = (name) =>
  name.startsWith('NEXT_PUBLIC_') ? `NEXT_PUBLIC_SSO_${name.slice('NEXT_PUBLIC_'.length)}` : `SSO_${name}`
const isPrefixed = (name) => /^(NEXT_PUBLIC_)?SSO_/.test(name)

const tracked = execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(Boolean)

const inScope = (file) =>
  (/\.(js|mjs|cjs|ts|tsx|jsx)$/.test(file) && /^(lib|pages|scripts|tools)\//.test(file)) ||
  file === 'middleware.js' ||
  file === 'next.config.js'
const excluded = (file) => /^pages\/docs\//.test(file) || /\.test\./.test(file) || /(^|\/)__tests__\//.test(file)

const violations = []
const used = new Set()

for (const file of tracked.filter((f) => inScope(f) && !excluded(f))) {
  const lines = readFileSync(path.join(ROOT, file), 'utf8').split('\n')
  lines.forEach((line, index) => {
    const trimmed = line.trimStart()
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return
    for (const match of line.matchAll(/\bprocess\.env\.([A-Z][A-Z0-9_]*)\b/g)) {
      const name = match[1]
      if (PLATFORM.test(name)) continue
      if (isPrefixed(name)) {
        used.add(name)
        continue
      }
      const fallback = `process.env.${prefixed(name)} ?? process.env.${name}`
      if (line.includes(fallback)) {
        used.add(prefixed(name))
        continue
      }
      violations.push(`${file}:${index + 1}: reads ${name}; use (${fallback})`)
    }
  })
}

const example = readFileSync(path.join(ROOT, '.env.example'), 'utf8')
const documented = new Set([...example.matchAll(/^#?\s*([A-Z][A-Z0-9_]*)=/gm)].map((m) => m[1]))
const undocumented = [...used].filter((name) => !documented.has(name)).sort()

for (const name of undocumented) violations.push(`.env.example: ${name} is read in code but not documented`)

if (violations.length > 0) {
  console.error(`[check-env] ${violations.length} problem(s):`)
  for (const v of violations) console.error(`  ${v}`)
  process.exit(1)
}
console.log(`[check-env] OK - ${used.size} SSO_ variables read in code, all documented in .env.example`)
