# thanperfect – Development Direction

> 📅 Last updated: 2025-06-09T15:30:51.540Z  
> 📌 Version: v0.2.0

---

## 🎯 Project Objective

Create a minimal, privacy-respecting SSO system that issues a session token based on arbitrary user-provided text identifiers. No authentication provider, no emails, no passwords.

---

## ✅ Confirmed Design Rules

| Area | Rule |
|------|------|
| **Framework** | Next.js only (JavaScript) |
| **Linting** | ❌ No ESLint |
| **Admin Access** | Public `/admin` route, no login |
| **Token Duration** | 10 minutes |
| **Token Storage** | In-memory only |
| **Token Extension** | ❌ Not allowed |
| **Identifiers** | Free-form UTF-8 (e.g. `"."`, `"❤️"`) |
| **Personal Data** | ❌ Never stored |
| **Session Validation** | via `/api/validate` |
| **Redirect Support** | via `?redirect=` param on `/` |
| **Documentation** | All `.md` files versioned, ISO timestamps required |
| **Version Tracking** | ✅ GitHub tags and CHANGELOG required |

---

## 🧩 Tech Stack

- **Frontend/Backend**: Next.js
- **Realtime (future)**: Socket.io
- **Database**: MongoDB Atlas
- **ORM**: Mongoose
- **Session**: UUID + timestamp in JS `Map`
- **Hosting**: Vercel
- **Version Control**: GitHub

---

## 📦 Deliverables in v0.2.0

- Identifier creation and reuse (`/api/auth`)
- Activity logging (`created`, `used`, `updated`)
- Token generation and validation (`/api/validate`)
- Admin dashboard with:
  - Edit + delete
  - Activity timeline
- Frontend redirect support
- Versioned documentation

---

## 🧭 Roadmap

| Feature | Status |
|---------|--------|
| ✅ Activity log in admin | Implemented |
| ✅ Redirect after auth | Implemented |
| ✅ SSO token validation | Implemented |
| ✅ Delete and update API endpoints | Implemented |
| ❌ Token extension support | Not planned |
| ❌ Rate limiting | Not yet started |
| ❌ External admin protection | Not implemented |
| ❌ Redis token storage | Not implemented |

---

## 📦 Update – v0.2.0 → v1.0.0 Prep Phase

> 📅 Last updated: 2025-06-09T15:40:01Z

### 🚩 Immediate Tasks

- [ ] Test login and redirect from a separate consumer app
- [ ] Validate token format and behavior in target app
- [ ] Confirm 10-minute session expiry
- [ ] Confirm correct redirect behavior and param passing
- [ ] Run through /admin CRUD interface
- [ ] Tag stable version as `v1.0.0` after manual QA

### 🔮 Optional Enhancements (After v1.0.0)

- Activity filters in `/admin`
- Dashboard-style token analytics
- Source URL registry for per-client TTL or branding

