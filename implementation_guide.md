# thanperfect – Implementation Guide

> 📅 Last updated: 2025-06-09T15:30:51.540Z  
> 📌 Version: v0.2.0

This guide documents how to implement, configure, and extend the thanperfect system.

---

## 🏗️ Project Structure

```
/thanperfect
├── lib/
│   ├── db.js
│   └── tokenStore.js
├── models/
│   └── Identifier.js
├── pages/
│   ├── index.js
│   ├── admin.js
│   └── api/
│       ├── auth.js
│       ├── list.js
│       ├── update.js
│       ├── delete.js
│       └── validate.js
```

---

## 🔌 Environment Setup

1. **Install**
```bash
npm install
```

2. **Create `.env.local`**
```env
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/...
```

3. **Run**
```bash
npm run dev
```

---

## 🧠 Core Logic

### 🔐 Token Handling (`lib/tokenStore.js`)
- Generated using `crypto.randomUUID()`
- Stored in-memory with expiry timestamp (10 minutes)
- No refresh or cookie-based sessions

### 🧠 Database Schema (`models/Identifier.js`)
- Fields:
  - `value`: unique string (identifier)
  - `createdAt`: auto-timestamp
  - `activities[]`: array of `{ type, timestamp, source }`
    - `type`: `"created"`, `"used"`, `"updated"`
    - `timestamp`: ISO 8601 formatted
    - `source`: optional string, e.g. app URL

---

## 🌐 API Behavior

| Endpoint           | Method | Description |
|--------------------|--------|-------------|
| `/api/auth`        | POST   | Checks or creates identifier, returns token |
| `/api/list`        | GET    | Returns all stored identifiers |
| `/api/update`      | POST   | Modifies an existing identifier |
| `/api/delete`      | DELETE | Deletes identifier |
| `/api/validate`    | GET    | Validates token from external app |

---

## 🖼️ Frontend Components

### `index.js`
- Input field and submit button
- Handles optional `?redirect=` query param
- Redirects user with `?token=` if applicable

### `admin.js`
- Shows all identifiers
- Allows inline edit and delete
- Displays full `activities[]` log

---

## 🔁 Activity Log Format

Every interaction is logged as:

```json
{
  "type": "created" | "used" | "updated",
  "timestamp": "2025-06-09T14:25:00.000Z",
  "source": "https://yourapp.com/login"
}
```

---

## 🧩 Optional Enhancements

| Feature | Status |
|---------|--------|
| Extend session if user remains active | ❌ Not implemented |
| Rate limit or token throttling | ❌ Not implemented |
| Role-based admin PIN | ❌ Not implemented |
| Redis-based token store | ❌ Not implemented |
