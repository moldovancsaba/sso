# thanperfect – Implementation Guide

This document provides a detailed step-by-step guide for developers to understand and implement the `thanperfect` minimal SSO system.

---

## 📁 1. Project Folder Structure

```
/thanperfect
├── lib/
│   ├── db.js            # MongoDB connection
│   └── tokenStore.js    # In-memory token/session store
├── models/
│   └── Identifier.js    # Mongoose schema
├── pages/
│   ├── index.js         # Main input UI
│   ├── admin.js         # Admin list and management UI
│   └── api/
│       ├── auth.js      # Identifier check/create and token issuance
│       ├── list.js      # Identifier listing
│       ├── update.js    # Identifier update
│       └── delete.js    # Identifier deletion
```

---

## 🔌 2. MongoDB Connection (`lib/db.js`)

```js
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable");
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    }).then(m => m);
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

export default dbConnect;
```

---

## 🧠 3. Data Model Details (`models/Identifier.js`)

- **value**: free-form string used as the identifier
- **createdAt**: when it was first saved
- **activities[]**: timeline of `created`, `used`, `updated` with timestamps and source URL

Use this to log each interaction without storing personal data.

---

## 🔐 4. Token/Session Handling (`lib/tokenStore.js`)

```js
const tokenMap = new Map();

export function createToken(identifier) {
  const token = crypto.randomUUID();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
  tokenMap.set(token, { identifier, expiresAt });
  return token;
}

export function validateToken(token) {
  const session = tokenMap.get(token);
  if (!session || session.expiresAt < Date.now()) return null;
  return session.identifier;
}
```

Tokens are never stored in DB. This keeps implementation simple and avoids sensitive data.

---

## 🧪 5. API Routes Logic

### `/api/auth.js`
- Accepts POST `{ value, source }`
- If identifier exists:
  - Log `used` activity
- Else:
  - Create new identifier
  - Log `created` activity
- Return token (10 min)

### `/api/list.js`
- Returns all identifiers with metadata
- Admin use only

### `/api/update.js`
- Accepts POST `{ oldValue, newValue }`
- Updates the identifier's value
- Logs `updated` activity

### `/api/delete.js`
- Accepts DELETE `{ value }`
- Deletes identifier

---

## 🖼️ 6. Frontend Behavior

### `index.js`
- Full-screen centered input
- On submit:
  - POST to `/api/auth`
  - Display token success and store in `document.cookie`

### `admin.js`
- Table view of identifiers
  - Shows: value, createdAt, lastUsed, lastSource
- Admin actions: update/delete

---

## ⚠️ 7. Rules and Constraints

- ❌ No email, password, username, IP, fingerprint, etc.
- ✅ Only:
  - value (free-form string)
  - activities with type, timestamp, source URL
- 🧱 Only use official long-term supported packages:
  - `next`, `mongoose`

---

## 🚀 8. Deployment & Setup

### Clone Repository
```bash
git clone https://github.com/moldovancsaba/thanperfect.git
cd thanperfect
```

### Configure Environment
Create `.env.local`:

```env
MONGODB_URI=mongodb+srv://moldovancsaba:togwa1-xyhcEp-mozceb@mongodb-thanperfect.zf2o0ix.mongodb.net/?retryWrites=true&w=majority&appName=mongodb-thanperfect
```

### Install Dependencies
```bash
npm install
```

### Run Locally
```bash
npm run dev
```

### Deploy
```bash
vercel
```

---

## ✅ Summary

This guide enables any developer to build, understand and deploy the `thanperfect` system, ensuring:

- Simple setup
- Free-form ID entry
- Privacy-safe session issuance
- Full control without third-party dependencies

