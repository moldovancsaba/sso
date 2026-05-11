# Role System Consolidation

Last updated: 2026-05-10T00:00:00.000Z

## Purpose

This document records the role consolidation now enforced by the runtime.

## Canonical Roles

### Admin system
- `admin`

### App permissions
- `none`
- `user`
- `admin`

## Legacy Compatibility

The codebase still accepts some legacy values when reading old records or handling older scripts, but it normalizes them immediately:

- `super-admin` -> `admin`
- `superadmin` -> `admin`
- `owner` -> `admin`
- `guest` -> `none`

This means the compatibility layer exists to keep old data and old calls from breaking, not to preserve those roles as valid runtime contracts.

## Current Runtime Expectations

- New admin users should be created with role `admin`
- New app permission writes should use only `none`, `user`, or `admin`
- New documentation should not describe `super-admin`, `owner`, or `guest` as valid current roles

## Migration Outcome

The role consolidation is functionally complete in the runtime paths that matter:

- admin-session authorization
- admin user creation and updates
- OAuth user lookup and claims normalization
- app permission reads and writes
- admin operational scripts used for bootstrap and access grants

## Remaining Cleanup

The remaining work is documentation and secondary-surface cleanup:

- legacy wording in older docs and archived notes
- stale examples in `pages/docs`
- historical one-off scripts that still print old terminology

## Operational Guidance

If you see old role values in MongoDB, treat them as migration residue. Do not write new data using them. The intended steady state is:

- admin collection role: `admin`
- app permission role: `none`, `user`, or `admin`
