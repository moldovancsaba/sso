# Archive Directory

This directory contains obsolete documentation files preserved for historical reference.

## Structure

- `october-2024/` - Files from October 2024 development cycle (planning docs, progress trackers, bug fix logs)
- `integration-guides-old/` - Obsolete integration guides superseded by THIRD_PARTY_INTEGRATION_GUIDE.md
- `audit-reports/` - Old audit reports superseded by current documentation and DOCUMENTATION_AUDIT_REPORT.md

## Active Documentation

See parent directory (`/docs`) and root directory for current, maintained documentation:

**Core Documentation** (Root):
- `README.md` - Main project documentation
- `ARCHITECTURE.md` - System architecture
- `LEARNINGS.md` - Lessons learned
- `ROADMAP.md` - Future plans
- `TASKLIST.md` - Active tasks
- `RELEASE_NOTES.md` - Version history
- `WARP.md` - Development guide

**Integration & Feature Docs** (`/docs`):
- `THIRD_PARTY_INTEGRATION_GUIDE.md` - **PRIMARY** integration guide (replaces all archived integration guides)
- `MULTI_APP_PERMISSIONS.md` - Multi-app permission system
- `PKCE_CONFIGURATION.md` - PKCE configuration
- `GOOGLE_LOGIN_SETUP.md` - Google Sign-In setup
- `FACEBOOK_LOGIN_SETUP.md` - Facebook Login setup
- `ACCOUNT_LINKING.md` - Account linking system

## Why These Files Were Archived

### October 2024 Development Files
These files were temporary progress trackers, planning documents, and bug fix logs from the October 2024 development cycle. Their content has been integrated into the current documentation (ROADMAP, TASKLIST, LEARNINGS, RELEASE_NOTES).

### Integration Guides
Multiple integration guides existed causing confusion about which was authoritative. All have been consolidated into `THIRD_PARTY_INTEGRATION_GUIDE.md`, which is now the single source of truth for integration.

### Audit Reports
Old audit reports from security and architecture reviews. Findings have been integrated into ARCHITECTURE.md, LEARNINGS.md, and superseded by DOCUMENTATION_AUDIT_REPORT.md.

## Git History

All archived files remain in Git history. Use `git log --follow <filename>` to see the complete history of any archived file.

---

**Last Archived**: 2025-12-21T10:00:00.000Z  
**Archive Reason**: Documentation cleanup per DOCUMENTATION_AUDIT_REPORT.md  
**Files Archived**: 27 files (16 root + 9 docs/ + 2 audit reports)
