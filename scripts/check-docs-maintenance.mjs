#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const packageJson = JSON.parse(
  fs.readFileSync(path.join(root, 'package.json'), 'utf8')
)

const expectedVersion = packageJson.version

const versionedDocs = [
  'docs/README.md',
  'docs/ARCHITECTURE.md',
  'docs/ROADMAP.md',
  'docs/TASKLIST.md',
  'docs/THIRD_PARTY_INTEGRATION_GUIDE.md',
]

const historicalDocs = [
  'docs/DOCUMENTATION_AUDIT_REPORT.md',
  'docs/DIAGNOSIS.md',
  'docs/STYLE_EDITOR_GUIDE.md',
  'docs/RELEASE_NOTES.md.bak',
  'docs/WARP copy.md',
]

const forbiddenTrackedFiles = [
  'docs/.DS_Store',
  'docs/archive/.DS_Store',
]

function readFile(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8')
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

function main() {
  for (const file of versionedDocs) {
    const content = readFile(file)
    assert(
      content.includes(`Version: ${expectedVersion}`) || content.includes(`**Version**: ${expectedVersion}`),
      `${file} does not match package version ${expectedVersion}`
    )
  }

  for (const file of historicalDocs) {
    const content = readFile(file)
    assert(
      /Historical/i.test(content),
      `${file} is expected to be clearly marked as historical`
    )
  }

  for (const file of forbiddenTrackedFiles) {
    assert(!fs.existsSync(path.join(root, file)), `${file} should not be tracked`)
  }

  console.log('[docs-maintenance] OK')
}

main()
