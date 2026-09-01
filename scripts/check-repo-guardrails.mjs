#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()

// WHAT: Secret scanning covers every tracked file — no prefix list.
// WHY: The old prefix list skipped the repo root, which is exactly where a set of
//      copied-in foreign files sat with a plaintext token in four of them. A scan
//      that exempts locations is a scan that misses the next accident. (The old
//      list also named components/ and src/, directories that no longer exist.)

const ROUTE_DUPLICATE_SCAN_PREFIXES = [
  'pages/',
]

const HARDCODED_MONGODB_URI_PATTERN = /mongodb(?:\+srv)?:\/\/[^/\s:@]+:[^@\s]+@/i
const ROUTE_DUPLICATE_NAME_PATTERN = /(?:\s+\d+|[-_\s](?:old|backup|copy))(?:\.[^.]+)$/i
const ROUTE_FILE_PATTERN = /\.(?:js|jsx|ts|tsx|mjs|cjs)$/i
const DESIGN_SSOT_REPO_PATTERN = /https:\/\/github\.com\/sovereignsquad\/general-design-system/i

const DESIGN_SSOT_DOC_FILES = [
  'AGENTS.md',
  'README.md',
  'docs/README.md',
  'docs/ARCHITECTURE.md',
  'docs/DESIGN_SYSTEM.md',
  'docs/THIRD_PARTY_INTEGRATION_GUIDE.md',
  'docs/WARP.md',
]

const DESIGN_SSOT_BANNED_PATTERNS = [
  /Design\s*\/\s*UI\s*\/\s*UX\s*SSOT:\s*\[docs\/DESIGN_SYSTEM\.md\]/i,
  /SSOT lives in\s*\[`?\/Users\/Shared\/Projects\/GENERAL_DESIGN_SYSTEM\/README\.md`?\]/i,
  /and locally tracked in\s*\[docs\/DESIGN_SYSTEM\.md\][^\n]*SSOT/i,
]

function getTrackedFiles() {
  const output = execFileSync('git', ['ls-files'], {
    cwd: ROOT,
    encoding: 'utf8',
  })

  return output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

function isUnderTrackedPrefix(filePath, prefixes) {
  return prefixes.some((prefix) => filePath.startsWith(prefix))
}

function findHardcodedMongoUris(files) {
  const offenders = []

  for (const file of files) {
    const absolutePath = path.join(ROOT, file)
    if (!existsSync(absolutePath)) {
      continue
    }
    const content = readFileSync(absolutePath, 'utf8')

    if (HARDCODED_MONGODB_URI_PATTERN.test(content)) {
      offenders.push(file)
    }
  }

  return offenders
}

function findDuplicateRouteFiles(files) {
  return files.filter((file) => {
    if (!isUnderTrackedPrefix(file, ROUTE_DUPLICATE_SCAN_PREFIXES)) {
      return false
    }

    if (file.startsWith('pages/docs/')) {
      return false
    }

    if (!ROUTE_FILE_PATTERN.test(file)) {
      return false
    }

    return ROUTE_DUPLICATE_NAME_PATTERN.test(path.basename(file))
  })
}

function findDesignSsotViolations(files) {
  const offenders = []

  for (const file of DESIGN_SSOT_DOC_FILES) {
    if (!files.includes(file)) {
      continue
    }

    const absolutePath = path.join(ROOT, file)
    if (!existsSync(absolutePath)) {
      continue
    }
    const content = readFileSync(absolutePath, 'utf8')
    const missingCanonicalSsotReference = !DESIGN_SSOT_REPO_PATTERN.test(content)
    const bannedMatch = DESIGN_SSOT_BANNED_PATTERNS.find((pattern) => pattern.test(content))

    if (missingCanonicalSsotReference || bannedMatch) {
      const reasons = []
      if (missingCanonicalSsotReference) {
        reasons.push('missing canonical general-design-system repo reference')
      }
      if (bannedMatch) {
        reasons.push(`contains banned SSOT wording: ${bannedMatch}`)
      }
      offenders.push(`${file} (${reasons.join('; ')})`)
    }
  }

  return offenders
}

// WHAT: getAdminUser reads only the legacy `admin-session` cookie. The current admin login is
//       OAuth-based and issues a `public-session` cookie plus an appPermissions grant instead,
//       so a gate built on getAdminUser alone rejects every real admin.
// WHY:  This shipped twice — /admin/activity's page gate redirect-looped, and admin logout was
//       a silent no-op — because the 2024 migration script only rewrote pages/api/admin/**, and
//       nothing stopped new code from reaching for the obvious-looking helper afterwards. The
//       resolver (resolveAdminIdentity) and the API middleware (requireUnifiedAdmin) both live
//       in lib/auth.mjs, so that file is the only legitimate place to name getAdminUser.
const LEGACY_ADMIN_GATE_PATTERN = /\bgetAdminUser\b/
const LEGACY_ADMIN_GATE_ALLOWED_FILES = new Set([
  'lib/auth.mjs',
  'lib/unifiedAuth.mjs',
  '__tests__/admin-session-identity.test.js',
  'scripts/check-repo-guardrails.mjs', // this file names the pattern it bans
])

function findLegacyAdminGates(files) {
  const offenders = []

  for (const file of files) {
    if (!/\.(js|jsx|mjs|cjs|ts|tsx)$/.test(file)) continue
    if (LEGACY_ADMIN_GATE_ALLOWED_FILES.has(file)) continue

    const absolutePath = path.join(ROOT, file)
    if (!existsSync(absolutePath)) continue

    const lines = readFileSync(absolutePath, 'utf8').split('\n')
    lines.forEach((line, index) => {
      // Prose mentions in comments are how the trap gets explained; only real code counts.
      const code = line.replace(/\/\/.*$/, '').replace(/^\s*\*.*$/, '')
      if (LEGACY_ADMIN_GATE_PATTERN.test(code)) {
        offenders.push(`${file}:${index + 1}`)
      }
    })
  }

  return offenders
}

function failWithReport(title, offenders) {
  console.error(`\n[repo-guardrails] ${title}`)
  for (const offender of offenders) {
    console.error(`- ${offender}`)
  }
}

function main() {
  const files = getTrackedFiles()
  const hardcodedMongoUriFiles = findHardcodedMongoUris(files)
  const duplicateRouteFiles = findDuplicateRouteFiles(files)
  const designSsotViolations = findDesignSsotViolations(files)
  const legacyAdminGates = findLegacyAdminGates(files)

  if (hardcodedMongoUriFiles.length > 0) {
    failWithReport('Hardcoded MongoDB credential-bearing URI found in tracked source files:', hardcodedMongoUriFiles)
  }

  if (duplicateRouteFiles.length > 0) {
    failWithReport('Duplicate or backup-like files found in the routed pages tree:', duplicateRouteFiles)
  }

  if (designSsotViolations.length > 0) {
    failWithReport(
      'Design-system SSOT documentation drift detected. The canonical source must remain https://github.com/sovereignsquad/general-design-system in core docs:',
      designSsotViolations,
    )
  }

  if (legacyAdminGates.length > 0) {
    failWithReport(
      'getAdminUser used outside lib/auth.mjs. It checks only the legacy admin-session cookie, which the OAuth admin login never sets — use resolveAdminIdentity(req), or requireUnifiedAdmin(req, res) in API routes:',
      legacyAdminGates,
    )
  }

  if (
    hardcodedMongoUriFiles.length > 0 ||
    duplicateRouteFiles.length > 0 ||
    designSsotViolations.length > 0 ||
    legacyAdminGates.length > 0
  ) {
    process.exit(1)
  }

  console.log('[repo-guardrails] OK')
}

main()
