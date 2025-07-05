# Simple SSO

[![Version](https://img.shields.io/badge/version-v0.2.0-blue.svg)](./CHANGELOG.md)
**Last Updated:** 2025-06-09T15:30:51.540Z

---

## 🧠 Project Purpose

Simple SSO is a privacy-first, minimal SSO authentication mechanism using arbitrary string identifiers (such as `"."`, `"❤️"`, `"banana"`) in place of traditional usernames or email-based auth.

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
   https://sso.example.com?redirect=https://yourapp.com/callback
   ```

2. **On submission**, user will be redirected with a token:
   ```
   https://yourapp.com/callback?token=abc123
   ```

3. **Validate token in your app**:
   ```http
   GET https://sso.example.com/api/validate?token=abc123
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
- [`sso_spec.md`](./sso_spec.md)
- [`sso_user_stories.md`](./sso_user_stories.md)
- [`sso_integration.md`](./sso_integration.md)

---

## 🔖 Current Version: v0.2.0

For full change history and roadmap, see [`CHANGELOG.md`](./CHANGELOG.md).

---

## ✅ Task Checklist (v0.2.0 → v1.0.0)

> 📅 Last updated: 2025-06-09T15:40:01Z

### Must-Have Before v1.0.0

- [ ] 🔁 Login from another app with redirect
- [ ] ✅ Validate token via API
- [ ] ⌛ Test session expiry after 10 minutes
- [ ] 🧪 Manual QA for all flows
- [ ] 🏁 Tag and archive v1.0.0 release

### Optional

- [ ] Minimal backend test cases
- [ ] Dashboard metrics
- [ ] Admin activity filters
- [ ] Client-specific TTL support

