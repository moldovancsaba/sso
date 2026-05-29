# Style Editor Guide

> Historical guide.
> The legacy style editor and its custom theme runtime have been removed as part of the Mantine refactor.

Status: Removed  
Last updated: 2026-05-21

Removed items:

- `/Users/moldovancsaba/Projects/sso/pages/admin/style-editor.js`
- `/Users/moldovancsaba/Projects/sso/components/ThemeProvider.js`
- `/Users/moldovancsaba/Projects/sso/lib/styleThemes.mjs`
- `/Users/moldovancsaba/Projects/sso/pages/api/admin/themes/*`
- `/Users/moldovancsaba/Projects/sso/pages/api/themes/active.js`

Reason:

- the project now treats Mantine as the only live product UI foundation
- the old runtime theme editor was a parallel system and no longer matched the shipped UI model

Source of truth:

- design, UI, and UX rules: [general-design-system README](https://github.com/sovereignsquad/general-design-system/blob/main/README.md)
- SSO local adapter: [`/Users/moldovancsaba/Projects/sso/docs/DESIGN_SYSTEM.md`](/Users/moldovancsaba/Projects/sso/docs/DESIGN_SYSTEM.md)

If Mantine-native theme management is reintroduced later, document it as a new feature instead of treating this removed guide as active reference.
