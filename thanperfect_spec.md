# thanperfect – Minimal SSO System Specification

## 🧠 Project Overview
- **Name:** thanperfect
- **Purpose:** Create a minimal SSO-like authentication system using a free-form identifier (e.g. ".", "❤️") with a 10-minute session token. No personal data stored.
- **Deployment:** [Vercel Project](https://vercel.com/narimato/thanperfect)
- **Source Code:** [GitHub Repository](https://github.com/moldovancsaba/thanperfect.git)
- **Database:** MongoDB Atlas  
  URI: `mongodb+srv://moldovancsaba:togwa1-xyhcEp-mozceb@mongodb-thanperfect.zf2o0ix.mongodb.net/?retryWrites=true&w=majority&appName=mongodb-thanperfect`

---

## 🧱 Tech Stack

| Component          | Technology        |
|--------------------|--------------------|
| Frontend           | Next.js (App Router optional) |
| Backend            | Next.js API Routes |
| Session Handling   | Cookie-based session + in-memory token (Map) |
| Database           | MongoDB + Mongoose |
| Hosting            | Vercel |
| Version Control    | GitHub |

---

## 📐 Data Model (Mongoose Schema)

```js
// models/Identifier.js
import mongoose from 'mongoose';

const ActivitySchema = new mongoose.Schema({
  type: { type: String, enum: ['created', 'used', 'updated'], required: true },
  timestamp: { type: Date, default: Date.now },
  source: { type: String } // Optional URL reference
}, { _id: false });

const IdentifierSchema = new mongoose.Schema({
  value: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now },
  activities: [ActivitySchema]
});

export default mongoose.models.Identifier || mongoose.model('Identifier', IdentifierSchema);
```

---

## 🔐 Session Token Logic

- Tokens last for 10 minutes
- Stored in a server-side `Map` (can be switched to Redis later)
- Token structure: UUID or SHA256 hash
- Example:

```js
const tokenMap = new Map();

export function createToken(identifier) {
  const token = crypto.randomUUID();
  const expiresAt = Date.now() + 10 * 60 * 1000;
  tokenMap.set(token, { identifier, expiresAt });
  return token;
}

export function validateToken(token) {
  const session = tokenMap.get(token);
  if (!session || session.expiresAt < Date.now()) return null;
  return session.identifier;
}
```

---

## 🧪 API Endpoints

| Endpoint        | Method | Description                                   |
|-----------------|--------|-----------------------------------------------|
| `/api/auth`     | POST   | Checks or creates an identifier, returns token |
| `/api/list`     | GET    | Lists all saved identifiers                   |
| `/api/update`   | POST   | Modifies an identifier                        |
| `/api/delete`   | DELETE | Deletes an identifier                         |

---

## 🖼️ Frontend UX

### `/` – Authentication Form
- Minimal full-screen form with one input field and one submit button
- Sends the value to `/api/auth`
- If successful, saves token in `document.cookie`

### `/admin` – Identifier Management
- List view with columns:
  - `value`
  - `createdAt`
  - `lastUsedAt`
  - `lastSource`
- Actions:
  - Edit
  - Delete

---

## 📦 Required Package

```bash
npm install mongoose
```

> **No other external libraries allowed. No Auth0, no JWT, no OAuth. Only long-term supported packages.**

---

## 🔐 Data Privacy

- ❌ No email, password, name, IP, or device data stored
- ✅ Only data stored:
  - identifier value
  - timestamped activity records (create/use/update)
  - service source (URL)

---

## 📍 Future Ideas

| Feature                           | Priority |
|-----------------------------------|----------|
| Redis cache for tokens            | 🔲 Low    |
| Rate limiting                     | 🔲 Medium |
| Admin PIN access                  | 🔲 Medium |
| Extend token on active use        | 🔲 Medium |

---

## ✅ Next Step

Ready to generate:
- `models/Identifier.js`
- `lib/db.js` for MongoDB connection
- `lib/tokenStore.js`
- `pages/api/auth.js`
- `pages/index.js`
- `pages/admin.js`

