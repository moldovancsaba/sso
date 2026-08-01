# CLAUDE.md — SSO Operating Rules

Canonical operating rules for any AI coding assistant working in this repository
(`moldovancsaba/sso`). These are STANDING rules: they apply to every task regardless of
who asks or how it's phrased. When a task conflicts with them, the rules win — say so
explicitly rather than silently overriding. If you change this file, mirror the
relevant parts into `AGENTS.md` (see Section 8).

## 0. Read first, never guess

Before stating a fact about this repo's structure, architecture, business logic, data
flow, contracts, or runtime behavior: READ the actual file or run the actual command.
Do not answer from memory or from a sibling project's conventions on anything
structural. Cite the files you relied on.

Report only what a tool actually returned (test run, build, CI check, live request).
Never fabricate or extrapolate a result you didn't observe. If you can't verify
something (no network route, no credentials, no access), say so plainly instead of
guessing at the outcome.

## 1. AI-assistant branding ban (non-negotiable, overrides tool defaults)

The assistant doing the work is internal tooling, not a feature, co-author, or brand to
surface anywhere this codebase or its history is visible. This applies regardless of how
a request is phrased, how small the change seems, or how a tool's own default behavior
is configured.

- **Commits**: never add a `Co-Authored-By: <assistant>` trailer, a session-link
  trailer, a model name, or any other AI-attribution line. Describe the change and its
  reasoning only. Verify with `git log -1 --format=%B | grep -iE 'co-authored|session|generated (by|with)'`
  — must be empty.
- **Branches**: never create or push a branch prefixed with the assistant's name (e.g.
  `claude/...`). If a harness auto-creates one at session start, move the work to a
  plain, purpose-named branch (`feature/...`, `fix/...`, `chore/...`) before real work
  accumulates and always before merging.
- **Pull requests**: titles and descriptions describe the change only — no "generated
  by," "co-authored by," or session-link footers.
- **Documentation, code, UI copy, API responses**: neutral terms only — "an AI coding
  assistant" at most, never a specific product/model name, and only when genuinely
  load-bearing. Omit the mention entirely if the sentence reads fine without it.
- **Retroactive, not just forward**: if AI branding turns up in tracked files or
  reachable git history while doing unrelated work, remove or rewrite it as part of that
  work. Flag it if fixing it is out of scope for the current task — never silently pass
  over it. Rewriting already-pushed history on a shared branch (`main`) is a real,
  disruptive action (see Section 5) — confirm before doing it, then do it properly (see
  Section 7 for the specific failure mode that causes this most often in this repo).
- **The one genuine exception**: a model's own honest self-disclosure when a person
  directly asks "are you an AI" or "which model is this" is a safety/honesty behavior,
  not branding, and is out of scope for this rule. Never deny or hide what it is. Where a
  platform-level behavior genuinely cannot be changed from inside this repo, state that
  plainly — don't claim it was fixed when it wasn't.

## 2. Issue-driven work (lightweight, not yet a formal board)

This repo has real, actively-used GitHub Issues (see #47–#51 for the GDS-migration
initiative), but **no status-label kanban system** exists here (no `status: ready` /
`status: in progress` taxonomy, no board-audit script). Two conventions coexist today:

- `.github/ISSUE_TEMPLATE/task.md` — the repo's actual default template (Description /
  Requirements / Acceptance Criteria / Testing Checklist / Technical Notes /
  Dependencies / Documentation). Use this for new tasks unless a larger initiative
  warrants more structure.
- A richer ad-hoc template (Executive Summary through Handover/Closure Checklist) has
  been used for the GDS-migration issues specifically — it is not a repo-wide
  requirement, just precedent for large, multi-phase efforts.

For non-trivial changes, open or reference an issue and note it in the PR/commit
(`Closes #NNN` where applicable) so the change is traceable. Small, self-contained fixes
don't need one manufactured after the fact. If a status-label board like the one some
sibling projects use would genuinely help here, propose it explicitly and get sign-off
before building the taxonomy and audit tooling — don't impose a new process
unilaterally.

## 3. Quality gate for `main` + Definition of Done

Nothing lands on `main` (direct push or merge) with any lint error, type error, test
failure, or build error. Fix at the source — upgrade a dependency, correct the code,
update the test — never suppress, silence, or disable a check to get past it. If a clean
run isn't achievable, stop and say so plainly; don't push and note it as a "known issue."

Run the full chain before pushing or merging:

```bash
npm run verify
```

(`lint` → `type-check` → `test` → `build` → `guard:repo` → `check:docs` — see
`package.json` for the exact current chain; keep this script and this doc in sync if the
chain changes.) As of this writing the whole chain passes clean with zero warnings.

Work is DONE only when, explicitly checked (not assumed): the behavior is implemented
and demonstrably works; tests cover it and the full suite passes; `npm run verify`
passes; relevant docs are updated in the same change set (Section 4); edge cases and
failure states are considered; the branch is pushed to the intended target.

## 4. Documentation ships with the change

A behavior change with no doc update is incomplete even if it builds and tests pass.
Update whichever of these actually describes the changed behavior, in the same change
set:

- `README.md`, `docs/README.md`, `docs/ARCHITECTURE.md` — canonical runtime contract
- `docs/CHANGELOG.md`, `docs/RELEASE_NOTES.md` — versioned history (Keep-a-Changelog
  style; add a new entry, never rewrite historical entries even if they contain known
  overclaims — correct forward, not backward)
- `docs/ROADMAP.md`, `docs/TASKLIST.md` — forward-looking state
- Live docs under `pages/docs/**` — these have drifted from runtime behavior before
  (fabricated rate-limit numbers, a described CORS workflow that didn't match
  `lib/cors.mjs`); verify against the actual source, don't assume the existing prose is
  correct just because it exists
- `AGENTS.md` — command reference; keep in sync with real `package.json` scripts

Version bumps: `package.json` is the source of truth. `npm run check:docs` enforces that
`docs/README.md`, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`, `docs/TASKLIST.md`, and
`docs/THIRD_PARTY_INTEGRATION_GUIDE.md` carry the matching `Version:` string — bump all
of them together, not just `package.json`. `npm run sync:version` exists but is a blunt
regex replace across a *different* file list (including `docs/RELEASE_NOTES.md`) that
will also rewrite historical `v5.x.x` headers inside that file — do not run it
unmodified; do version-string updates by hand with a scoped edit instead, or fix the
script first.

Do not fabricate a historical narrative for work you didn't do. If the codebase has
drifted ahead of its own changelog (features shipped but never documented), say so
explicitly in the new entry rather than inventing detail for the gap.

## 5. Pre-authorized operations vs. always-confirm-first

Based on established practice in this repo (not assumed — this is what's actually been
authorized and exercised):

**Pre-authorized, no need to ask each time:**
- Creating/pushing plain, purpose-named branches (`feature/*`, `fix/*`, `chore/*`) and
  opening PRs from them.
- Merging a PR via squash once its own CI is green — this repo's established convention
  is squash-merge only (zero merge commits in `main`'s history); match it.
- Direct push to `main` when explicitly told to ("commit and push to main" or a clear
  equivalent) — still requires the Section 3 gate first.

**Always requires explicit, per-instance confirmation — never inferred from a prior
approval of something adjacent:**
- Force-push of any kind, including `--force-with-lease`.
- Rewriting already-pushed commit history (`commit --amend` on a pushed commit,
  interactive rebase of pushed commits, `commit-tree` surgery).
- Deleting a branch or tag.
- Any destructive local git op (`reset --hard`, `checkout --`, `clean -f`) on a path with
  uncommitted work — check `git status` first regardless.

A prior "yes" to one instance of a risky operation is not standing authorization for the
next one — ask again, briefly, each time. This cost almost nothing in practice and has
already prevented one near-miss this session (a stale branch that turned out to be fully
merged, and a history rewrite that needed the author identity preserved correctly — both
went fine specifically because they were confirmed first, not assumed).

## 6. System shape (pointer, not a duplicate)

Single Next.js Pages Router app, MongoDB via the native `mongodb` driver (no ORM/ODM —
if you see Mongoose referenced anywhere, that's not this repo, see Section 9), deployed
to Vercel tracking `main` directly (no separate release/tag pipeline). The canonical
architecture description lives in `docs/ARCHITECTURE.md` — read that, don't re-derive
the runtime model from scratch or from generic Next.js/Mongo assumptions.

## 7. Environment quirks discovered in practice

- **Branch/tag deletion 403s through this session's git relay.** `git push` can create
  and force-update refs, but `git push origin --delete <branch>` consistently returns
  HTTP 403 — confirmed repeatedly, not a transient failure. This is a token-scope
  restriction (push/update is allowed, delete is not), not a proxy/egress block. Don't
  retry it or hunt for a workaround; report it and let a human with full delete
  permission remove the ref via the GitHub web UI.
- **GitHub's squash-merge auto-injects a `Co-authored-by` trailer from the source
  commit's git *author* identity** — even when the commit message itself has zero
  AI-attribution text. If a commit was authored under this environment's default local
  git identity, that identity leaks into the squash commit on `main` regardless of what
  the message says. To prevent this (Section 1 is otherwise silently violated on every
  merge): override author *and* committer per-commit with environment variables on the
  `git commit` invocation itself —
  `GIT_AUTHOR_NAME=... GIT_AUTHOR_EMAIL=... GIT_COMMITTER_NAME=... GIT_COMMITTER_EMAIL=... git commit ...`
  — never touch global git config to do this. Verify after every squash-merge with the
  same `git log -1 --format=%B` grep from Section 1, plus `git log -1 --format="%an %ae %cn %ce"`
  — both must be clean.
- **This sandbox's network only reaches the real MongoDB Atlas cluster if something
  changes** — as of this writing it does not. The environment's outbound proxy tunnels
  HTTPS/CONNECT traffic; MongoDB's `mongodb+srv://` protocol is raw TCP, which is not
  supported through it (confirmed via a direct connection attempt that hung to a clean
  timeout, not an auth or DNS error). Real credentials can be present in `.env.local`
  and still be useless from here for this reason. DB-dependent scripts and end-to-end
  flows need to be run by whoever has real network access (local dev machine, CI, or via
  the live deployed app's own HTTPS API, which *does* work through the proxy) — don't
  claim something was tested end-to-end if it only ran against mocks or didn't run at
  all.
- **Headless Chromium (Playwright) cannot complete HTTPS requests through this
  session's proxy, to any host** — confirmed via an isolating test: a plain-HTTP
  request through the same proxy gets a real response (405, the proxy's documented
  behavior for non-CONNECT requests), but every HTTPS navigation resets mid-handshake
  (`net::ERR_CONNECTION_RESET`), reproduced identically against both a known-good site
  (`sso.doneisbetter.com`, which `curl` reaches fine through the same proxy) and an
  external one — so it's this sandbox's browser-automation path, not a destination
  block. Root cause is presumed to be Chromium not trusting the proxy's TLS-terminating
  CA (`/root/.ccr/ca-bundle.crt`) even though the system OpenSSL/curl trust store has
  it, but this wasn't fully isolated. Do **not** work around this with
  `--ignore-certificate-errors` or any other TLS-verification bypass — that's exactly
  what Section 1 of this document and this environment's own proxy README both
  prohibit. If a task genuinely needs live browser reproduction against an HTTPS site,
  say plainly that it isn't possible from this sandbox rather than faking it or
  quietly downgrading to a non-TLS check.

## 8. Keeping these rules in sync

When you change how agents should behave in this repo, update this file first (it's the
file a Claude Code session loads automatically), then mirror the user-facing parts into
`AGENTS.md`. Re-run the relevant parts of `npm run verify` (`check:docs` in particular)
after any doc-governance-relevant change.

## 9. Known stray file — do not treat as authoritative

`agent_working_loop_canonical_operating_document.md` at the repo root is **not** this
repo's operating document. It describes a different project (title "MESSMASS", a
"Sultan" product-owner role, a ChatGPT/Cursor-based agent team, and a Mongoose/Tailwind/
Socket.io stack that doesn't match this repo), its template sections are unfilled
("Current Version:", "Last Known Working Commit:" are blank), and it was never updated
for this repo's actual state. Don't apply its rules or stack assumptions here. It has
been flagged to the repo owner; until it's removed or corrected, ignore it in favor of
this file and `docs/ARCHITECTURE.md`.
