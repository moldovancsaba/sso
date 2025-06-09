# Thanperfect Sso Integration

## Version History

---

### 🔖 v0.1.0
📅 Released: 2025-06-08T12:00:00.000Z

# thanperfect – How to Use as SSO in Other Applications

This guide explains how to integrate the `thanperfect` minimal SSO system into other web applications using a simple URL-based workflow.

---

## 🔐 Core Concept

- Users authenticate by submitting an identifier (e.g. ".", "❤️", "banana") at `thanperfect` and receive a 10-minute session token.
- This token can be passed via URL or header to other applications to confirm identity.
- No personal information is shared or stored.

---

## 🧪 Step-by-Step Integration Guide

### ✅ 1. User Redirects to thanperfect for Authentication

Your application should redirect the user to:

```
https://thanperfect.com?redirect=https://yourapp.com/callback
```

- The `redirect` query param defines where the user will be sent **after** authentication.
- The user submits their identifier on `thanperfect`, which creates or reuses a record and issues a token.

---

### ✅ 2. User is Redirected Back with Token

Once authenticated, `thanperfect` redirects the user back like so:

```
https://yourapp.com/callback?token=abc123xyz
```

> You must configure `thanperfect` to support this redirect logic on submit (customizable in the frontend logic).

---

### ✅ 3. Your App Validates the Token

Create a small validation route in your app:

```js
// /api/validate-token.js
export default async function handler(req, res) {
  const { token } = req.query;
  const response = await fetch("https://thanperfect.com/api/validate?token=" + token);
  const data = await response.json();

  if (data.valid) {
    // Proceed with session creation using data.identifier
    res.status(200).json({ user: data.identifier });
  } else {
    res.status(401).json({ error: "Invalid token" });
  }
}
```

---

### ✅ 4. thanperfect Token Validation Endpoint

To support token validation, add this route to `thanperfect`:

```js
// pages/api/validate.js
import { validateToken } from '../../lib/tokenStore';

export default function handler(req, res) {
  const token = req.query.token;
  const identifier = validateToken(token);
  if (!identifier) return res.status(401).json({ valid: false });
  res.json({ valid: true, identifier });
}
```

---

## 🔁 Optional: Pass Source URL

You can optionally provide a `source` field during initial login to log where the SSO is used:

```js
fetch('/api/auth', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ value: '❤️', source: 'https://yourapp.com/login' })
});
```

---

## 🧪 Security Considerations

- Token is only valid for 10 minutes
- No renewal, no refresh – must re-login after expiry
- Do not store token permanently
- Use HTTPS only

---

## 🧭 Summary

| Step | Description                         |
|------|-------------------------------------|
| 1    | Redirect user to `thanperfect.com`  |
| 2    | User submits identifier             |
| 3    | User is redirected back with token  |
| 4    | Your app validates the token        |
| 5    | If valid, session begins            |

---

### 🔖 v0.2.0
📅 Released: 2025-06-09T15:13:22.751Z

# thanperfect – SSO Integration Guide

> 📅 Last updated: 2025-06-09T15:03:44.239Z  
> 📌 Version: v0.2.0

This guide explains how to integrate the `thanperfect` minimal SSO system into external applications using a URL-based authentication and session validation approach.

---

## 🔐 Core Concept

- Users authenticate by submitting an identifier (e.g. ".", "❤️") at `thanperfect.com` and receive a 10-minute session token.
- This token can be passed to other apps via query string or header.
- No personal data is involved.

---

## 🧪 Integration Steps

### ✅ 1. Redirect User to thanperfect

Redirect the user to the authentication page:

```
https://thanperfect.com?redirect=https://yourapp.com/callback
```

- Optional query param `redirect` defines the return location after authentication.

---

### ✅ 2. User Enters Identifier and Submits

After submission, `thanperfect`:
- Issues a 10-minute token
- Logs activity: `created` or `used`
- Redirects to:  
```
https://yourapp.com/callback?token=abc123xyz
```

---

### ✅ 3. Validate Token in Your App

Your app should validate the received token using this endpoint:

```js
// /api/validate-token.js
export default async function handler(req, res) {
  const { token } = req.query;
  const response = await fetch("https://thanperfect.com/api/validate?token=" + token);
  const data = await response.json();

  if (data.valid) {
    res.status(200).json({ user: data.identifier });
  } else {
    res.status(401).json({ error: "Invalid token" });
  }
}
```

---

### ✅ 4. thanperfect Token Validation Endpoint

Implemented as:

```js
// pages/api/validate.js
import { validateToken } from '../../lib/tokenStore';

export default function handler(req, res) {
  const token = req.query.token;
  const identifier = validateToken(token);
  if (!identifier) return res.status(401).json({ valid: false });
  res.json({ valid: true, identifier });
}
```

---

## 🆕 Additional Optional Features

### ⏩ Redirect Support in Form Logic

Enhance frontend to read `redirect` from query string and apply it after token generation.

### 🌍 Source Tracking

Pass `source` with your identifier to log which app called the SSO:

```js
fetch('/api/auth', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ value: '❤️', source: 'https://yourapp.com/login' })
});
```

---

## 🔐 Security Notes

- 10-minute token expiry
- No session extension
- Tokens stored only in-memory
- HTTPS required

---

## ✅ Summary

| Step | Description                        |
|------|------------------------------------|
| 1    | Redirect to thanperfect            |
| 2    | User submits identifier            |
| 3    | User is redirected with token      |
| 4    | Your app validates token           |
| 5    | If valid, session begins           |

