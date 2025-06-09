# thanperfect – Functional Specification

> 📅 Last updated: 2025-06-09T15:30:51.540Z  
> 📌 Version: v0.2.0

---

## 🧠 Summary

thanperfect is a minimal authentication system using free-form text identifiers to issue temporary session tokens. Its purpose is to act as an SSO provider for other systems without storing any personal data.

---

## 📋 Functional Requirements

### 🔐 Authentication

- Accepts any UTF-8 string as an identifier
- Creates the identifier if it doesn't exist
- Issues a UUID token valid for 10 minutes
- All tokens are stored in memory (not persistent)

### 📜 Logging & Data Tracking

- Each identifier stores:
  - `createdAt` – ISO format
  - `activities[]` log: entries include:
    - `type`: `"created"`, `"used"`, `"updated"`
    - `timestamp`: ISO 8601
    - `source`: optional source string (e.g. calling app)

### 🛠 Admin UI

- Accessible at `/admin`
- Shows all identifiers
- Inline editing
- Deletion capability
- Shows full activity history per identifier

### 🔁 Redirect Logic

- Optional `?redirect=https://yourapp.com` query param on `/`
- After successful token issuance, user is redirected to:
  ```
  https://yourapp.com?token=<issued_token>
  ```

### ✅ SSO Token Validation

- Endpoint: `/api/validate`
- Query param: `token`
- Returns:
  ```json
  {
    "valid": true,
    "identifier": "<user_value>"
  }
  ```

---

## 📦 Technical Constraints

- No email, password, name, or IP is collected or stored
- No third-party auth (OAuth, JWT, Auth0) used
- Token is never stored in cookie or localStorage
- Everything must be long-term supported and minimal

---

## 📌 API Overview

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth` | POST | Submit identifier, receive token |
| `/api/update` | POST | Rename identifier |
| `/api/delete` | DELETE | Remove identifier |
| `/api/validate` | GET | Validate token for SSO |
| `/api/list` | GET | Admin list of all identifiers |

