// WHAT: Anchor file so `tsc --noEmit` always has at least one input.
// WHY: The app is currently plain JavaScript, and next-env.d.ts is generated
//      (gitignored, references build output) so it is absent on fresh checkouts —
//      without a tracked TypeScript file, type-check fails with TS18003 in CI.
//      Any TypeScript added anywhere in the repo is picked up by tsconfig's
//      include automatically; this file carries no declarations of its own.
export {}
