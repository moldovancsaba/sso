#!/usr/bin/env node

/**
 * scripts/check-release-integrity.mjs
 *
 * WHAT: Fails when the version in package.json has already been released as a tag that
 *       points somewhere other than HEAD.
 *
 * WHY: check-docs-maintenance.mjs verifies that package.json and the versioned docs carry
 *      the SAME version as each other. They always did. That check cannot detect the
 *      failure that actually keeps happening here: commits land on main, every document
 *      keeps agreeing on the previous version, and main quietly describes itself with a
 *      version that was already published. It happened three times on 2026-08-25 alone,
 *      and each time `npm run verify` was green throughout. Agreement between documents
 *      says nothing about whether those documents still describe the code.
 *
 * HOW: If a tag matching the current version exists and does not point at HEAD, the code
 *      has moved past a published release without a bump. That is the whole rule.
 *
 * Scope: intended for pushes to main. It is deliberately NOT part of `npm run verify`,
 *        because on a feature branch package.json legitimately still holds the last
 *        released version until the bump commit, which would make this fire on every
 *        branch that has not bumped yet.
 */

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()

function git(args, { quiet = false } = {}) {
  return execFileSync('git', args, {
    cwd: ROOT,
    encoding: 'utf8',
    // WHAT: Optionally discard the child's stderr.
    // WHY: Probing for a tag that does not exist is an expected outcome here, not a
    //      problem, but `git rev-parse --verify` still prints "fatal: Needed a single
    //      revision" before exiting non-zero. Without this, every clean run of a
    //      guardrail would print a fatal error, which is exactly how real failures get
    //      trained out of being read.
    stdio: quiet ? ['ignore', 'pipe', 'ignore'] : ['ignore', 'pipe', 'inherit'],
  }).trim()
}

function main() {
  const { version } = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8'))

  // WHAT: Accept both `v5.38.0` and `5.38.0`.
  // WHY: This repo tags with the `v` prefix, but nothing enforces that, and a bare tag
  //      would represent the same release just as effectively.
  const candidates = [`v${version}`, version]
  const existing = candidates.filter((tag) => {
    try {
      git(['rev-parse', '--verify', `refs/tags/${tag}`], { quiet: true })
      return true
    } catch {
      return false
    }
  })

  if (existing.length === 0) {
    console.log(`[release-integrity] OK — ${version} is not yet released`)
    return
  }

  const head = git(['rev-parse', 'HEAD'])

  for (const tag of existing) {
    // WHAT: Dereference, so annotated tags compare as their commit rather than the tag object.
    const tagged = git(['rev-list', '-n', '1', `refs/tags/${tag}`])
    if (tagged === head) {
      console.log(`[release-integrity] OK — HEAD is ${tag}`)
      return
    }
  }

  const tag = existing[0]
  const tagged = git(['rev-list', '-n', '1', `refs/tags/${tag}`])
  const behind = git(['rev-list', '--count', `${tagged}..${head}`])

  console.error(`
[release-integrity] package.json says ${version}, but ${tag} was already released and points elsewhere.

  ${tag} -> ${tagged.slice(0, 8)}
  HEAD   -> ${head.slice(0, 8)}  (${behind} commit(s) past the release)

${behind} commit(s) have landed since ${tag} without a version bump, so package.json,
docs/CHANGELOG.md and the published release all describe a state the code has moved past.

Fix by bumping package.json and the versioned docs, adding a docs/CHANGELOG.md entry for
the new version, then tagging. See CLAUDE.md section 4.
`)
  process.exit(1)
}

main()
