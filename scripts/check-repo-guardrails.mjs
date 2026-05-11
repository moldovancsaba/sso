#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()

const SECRET_SCAN_PREFIXES = [
  '.github/',
  'components/',
  'lib/',
  'pages/',
  'scripts/',
  'src/',
]

const ROUTE_DUPLICATE_SCAN_PREFIXES = [
  'pages/',
]

const HARDCODED_MONGODB_URI_PATTERN = /mongodb(?:\+srv)?:\/\/[^/\s:@]+:[^@\s]+@/i
const ROUTE_DUPLICATE_NAME_PATTERN = /(?:\s+\d+|[-_\s](?:old|backup|copy))(?:\.[^.]+)$/i
const ROUTE_FILE_PATTERN = /\.(?:js|jsx|ts|tsx|mjs|cjs)$/i

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
    if (!isUnderTrackedPrefix(file, SECRET_SCAN_PREFIXES)) {
      continue
    }

    const absolutePath = path.join(ROOT, file)
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

  if (hardcodedMongoUriFiles.length > 0) {
    failWithReport('Hardcoded MongoDB credential-bearing URI found in tracked source files:', hardcodedMongoUriFiles)
  }

  if (duplicateRouteFiles.length > 0) {
    failWithReport('Duplicate or backup-like files found in the routed pages tree:', duplicateRouteFiles)
  }

  if (hardcodedMongoUriFiles.length > 0 || duplicateRouteFiles.length > 0) {
    process.exit(1)
  }

  console.log('[repo-guardrails] OK')
}

main()
