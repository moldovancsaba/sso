/**
 * scripts/sync-version.mjs — Keeps version references consistent across docs
 */
import fs from 'fs'
import path from 'path'

const root = process.cwd()
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf-8'))
const version = pkg.version
const files = [
  'README.md',
  'ARCHITECTURE.md',
  'ROADMAP.md',
  'TASKLIST.md',
  'LEARNINGS.md',
  'RELEASE_NOTES.md',
  'WARP.DEV_AI_CONVERSATION.md',
].filter(f => fs.existsSync(path.join(root, f)))

for (const f of files) {
  const p = path.join(root, f)
  let content = fs.readFileSync(p, 'utf-8')
  content = content.replace(/v\d+\.\d+\.\d+/g, `v${version}`)
  content = content.replace(/Version:\s*\d+\.\d+\.\d+/g, `Version: ${version}`)
  fs.writeFileSync(p, content, 'utf-8')
}

console.log(`[sync-version] Updated docs to v${version}`)

