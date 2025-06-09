# thanperfect

**Version:** v0.2.0  
**Last Updated:** 2025-06-09T15:30:51.540Z

---

## 🧠 Project Purpose

thanperfect is a privacy-first, minimal SSO authentication mechanism using arbitrary string identifiers (such as `"."`, `"❤️"`, `"banana"`) in place of traditional usernames or email-based auth.

---

## ✅ Features

- 🔐 Identifier-based session token generation
- 🧠 Arbitrary UTF-8 input as identifier
- ⏱️ 10-minute token issuance, no extension
- 📜 Activity logging (`created`, `used`, `updated`) with timestamps and optional source URL
- 🧩 Admin UI with inline editing and delete options
- 🔁 SSO support with redirect and token validation

---

## 🗃️ File Structure Overview

| Path | Purpose |
|------|---------|
| `/pages/index.js` | Identifier input + optional redirect handling |
| `/pages/admin.js` | Management UI with ISO timestamped activities |
| `/pages/api/auth.js` | Token issuance & activity logging |
| `/pages/api/list.js` | Lists all identifiers |
| `/pages/api/update.js` | Updates identifier and logs it |
| `/pages/api/delete.js` | Deletes identifier |
| `/pages/api/validate.js` | Validates token from external app |
| `/lib/db.js` | MongoDB connection setup |
| `/lib/tokenStore.js` | In-memory token storage |
| `/models/Identifier.js` | Mongoose schema for identifier tracking |

---

## 🌐 Environment Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Create your local `.env.local` file:**
   ```env
   MONGODB_URI=your_mongodb_uri_here
   ```

3. **Run app locally:**
   ```bash
   npm run dev
   ```

---

## 🔐 Token Behavior

- Token is generated with `crypto.randomUUID()`
- Valid for **10 minutes** (in-memory only)
- No refresh or extension logic included
- Must re-authenticate after expiry

---

## 🔁 SSO Integration Guide

1. **Redirect to thanperfect:**
   ```
   https://thanperfect.com?redirect=https://yourapp.com/callback
   ```

2. **On submission**, user will be redirected with a token:
   ```
   https://yourapp.com/callback?token=abc123
   ```

3. **Validate token in your app**:
   ```http
   GET https://thanperfect.com/api/validate?token=abc123
   ```

---

## 🛠 Admin Features

- View all stored identifiers
- Edit any identifier inline
- Delete identifier
- View full `activities[]` log with ISO timestamps and source origin (if provided)

---

## 📄 Documentation

All documentation files now contain version sections:
- [`CHANGELOG.md`](./CHANGELOG.md)
- [`implementation_guide.md`](./implementation_guide.md)
- [`thanperfect_spec.md`](./thanperfect_spec.md)
- [`user_stories_thanperfect.md`](./user_stories_thanperfect.md)
- [`thanperfect_sso_integration.md`](./thanperfect_sso_integration.md)

---

## 🔖 Current Version: v0.2.0

For full change history and roadmap, see [`CHANGELOG.md`](./CHANGELOG.md).
