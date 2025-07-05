# Simple SSO – Changelog

## 🔖 v0.2.0
📅 Released: 2025-06-09T15:30:51.540Z

### ✅ Added
- `/api/update` endpoint to allow identifier renaming
- `/api/delete` endpoint for identifier removal
- `/api/validate` endpoint to validate 10-minute tokens for SSO integration
- Support for `redirect` query param on main page
- Admin panel now includes:
  - Inline editing
  - Delete button
  - Display of activity log with ISO 8601 timestamps
- Merged and versioned documentation (.md files)

### 🧠 Activity Log Format
- All events are saved with `type`, `timestamp`, and optional `source`
- Types: `created`, `used`, `updated`

---

## 🔖 v0.1.0
📅 Released: 2025-06-08T12:00:00.000Z

- Initial version
- Simple input form and backend
- MongoDB model: `Identifier`
- Token session system with 10-minute expiry
