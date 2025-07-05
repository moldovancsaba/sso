# thanperfect – SSO Integration Guide

> 📅 Last updated: 2025-06-09T15:30:51.540Z  
> 📌 Version: v0.2.0

---

## 🧭 Overview

thanperfect acts as an ultra-lightweight Single Sign-On (SSO) system using free-form text identifiers. It does **not** require registration, passwords, or personal data.

---

## 🔗 Authentication Flow

### 1. Redirect user to thanperfect
```
https://thanperfect.vercel.app/?redirect=https://yourapp.com/callback
```

### 2. User submits their identifier
- Can be anything (e.g. ".", "❤️", "robot99")

### 3. thanperfect issues a token and redirects to:
```
https://yourapp.com/callback?token=abc1234-xyz...
```

### 4. Your app validates the token
```
GET https://thanperfect.vercel.app/api/validate?token=abc1234-xyz...
```

#### Response
```json
{
  "valid": true,
  "identifier": "❤️"
}
```

---

## ✅ Integration Example

**Frontend (React):**
```js
const url = `https://thanperfect.vercel.app/?redirect=${encodeURIComponent(window.location.href)}`;
window.location.href = url;
```

**Backend (Node.js):**
```js
const fetch = require('node-fetch');
const verifyToken = async (token) => {
  const res = await fetch(`https://thanperfect.vercel.app/api/validate?token=${token}`);
  const data = await res.json();
  return data.valid ? data.identifier : null;
};
```

---

## ⚠️ Notes

- Identifiers are not unique — same value reused by any user
- Always validate token before accepting it
- Do not store tokens permanently

