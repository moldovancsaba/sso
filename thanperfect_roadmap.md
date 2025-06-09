# thanperfect – Roadmap

> 📅 Last updated: 2025-06-09T15:40:01Z  
> 📌 Version: v0.2.0

---

## ✅ Current Functionality (v0.2.0)

| Feature                        | Status | Notes                               |
|--------------------------------|--------|-------------------------------------|
| Identifier submission          | ✅ Done | via input box                       |
| Token issuance (10 min UUID)   | ✅ Done | `/api/auth`                         |
| MongoDB storage                | ✅ Done | with activities + timestamps        |
| Admin UI                       | ✅ Done | edit, delete, view activities       |
| Redirect with token            | ✅ Done | `/index.js?redirect=`               |
| Token validation               | ✅ Done | `/api/validate` endpoint            |
| Full documentation             | ✅ Done | Markdown versioned + timestamped   |

---

## 🔜 Next Actions (Immediate)

| Task                          | Priority | Owner | Status |
|-------------------------------|----------|--------|--------|
| Test SSO in another app       | 🔥 HIGH  | You    | ⬜ Pending |
| Manual QA all flows           | 🔥 HIGH  | You    | ⬜ Pending |
| Decide on token auto-refresh  | ⚠ Optional | You  | ⬜ Pending |
| Add minimal test suite        | ⚠ Optional | Me   | ⬜ Pending |
| Tag v1.0.0                    | ✅ After QA | Me   | ⬜ Pending |

---

## 🧰 Post 1.0 Suggestions

| Idea                                    | Description |
|----------------------------------------|-------------|
| Dashboard metrics                      | # of tokens issued, login activity graph |
| Optional token TTL per redirect domain | Allow TTL customization per partner |
| Source app registry                    | Ability to register apps using thanperfect |
| Add branding/logo injection            | Allow white-label style customization |
| Activity filters in admin              | e.g., view only updates or only logins |

---

## 🧪 Testing Plan

1. Use redirect to login from another app
2. Validate token server-side using `/api/validate`
3. Try identifier reuse
4. Check session expires after 10 minutes
5. Edit/delete identifiers from `/admin`

---

## 🧩 Integration Milestone

Once tests pass, we’ll:
- Tag version `v1.0.0`
- Archive `v0.2.0`
- Freeze public API
- Prepare integration instructions for SDK-style install (optional)

