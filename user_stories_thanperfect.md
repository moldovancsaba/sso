# thanperfect – User Stories

> 📅 Last updated: 2025-06-09T15:30:51.540Z  
> 📌 Version: v0.2.0

---

## 🧑‍💻 Visitor

### US01 – Enter Identifier
**As a** visitor  
**I want to** enter any text string as my identifier  
**So that** I can get access without creating an account

### US02 – Reuse Identifier
**As a** returning visitor  
**I want to** use the same identifier again  
**So that** I continue with the same identity

### US03 – Get Token
**As a** visitor  
**I want to** receive a 10-minute session token  
**So that** I can be temporarily authenticated

### US04 – Get Redirected After Auth
**As a** visitor  
**I want to** be redirected to my original app with the token  
**So that** I can continue my login flow

---

## 🔐 Session System

### US05 – Generate UUID Token
**As the** system  
**I want to** create a unique token for each login  
**So that** it's secure and easy to validate

### US06 – Expire After 10 Minutes
**As the** system  
**I want to** expire tokens after 10 minutes  
**So that** old tokens can't be reused

### US07 – Validate Token
**As a** relying app  
**I want to** send a token to `/api/validate`  
**So that** I can confirm if it's valid

---

## 🛠 Admin

### US08 – List All Identifiers
**As an** admin  
**I want to** see all stored identifiers  
**So that** I can manage users

### US09 – Edit Identifier
**As an** admin  
**I want to** rename identifiers  
**So that** I can fix typos or errors

### US10 – Delete Identifier
**As an** admin  
**I want to** delete any identifier  
**So that** I can clean up data

### US11 – View Activities
**As an** admin  
**I want to** see a log of all activities per identifier  
**So that** I understand usage over time

---

## 📄 Acceptance Criteria

| Story | Criteria |
|-------|----------|
| US01  | Accept any valid UTF-8 input |
| US02  | Match previous value if re-entered |
| US03  | Return valid UUID token |
| US04  | Redirect to URL with `?token=` |
| US05  | Token stored with `expiresAt` timestamp |
| US06  | Token becomes invalid after 10 mins |
| US07  | `/api/validate` returns valid/false |
| US08  | `/admin` shows all records |
| US09  | Identifier can be updated inline |
| US10  | Identifier can be removed |
| US11  | Activity log shown with ISO 8601 dates |

