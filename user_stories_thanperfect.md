# User Stories Thanperfect

## Version History

---

### 🔖 v0.1.0
📅 Released: 2025-06-08T12:00:00.000Z

# thanperfect – User Stories

This document describes detailed user stories to guide the development of the `thanperfect` minimal SSO system. Each story follows the standard "As a [user], I want [feature], so that [benefit]" format.

---

## 🧑‍💻 User Role: Visitor

### US01 – Submit an Identifier
**As a** visitor  
**I want to** type any string (e.g., ".", "❤️", "banana") into an input field and submit it  
**So that** I can receive a session token without registering or logging in  

### US02 – Receive Token for Known Identifier
**As a** returning visitor  
**I want to** receive a new session token if I enter an identifier that already exists  
**So that** I can reuse my previous identity  

### US03 – Receive Token for New Identifier
**As a** new visitor  
**I want to** receive a new session token if I enter a new identifier  
**So that** I can immediately start using the system without approval  

---

## 🔐 User Role: Session System

### US04 – Create a Temporary Token
**As the** system  
**I want to** generate a secure 10-minute token after identifier submission  
**So that** the user session can be validated temporarily  

### US05 – Store Session Server-side
**As the** system  
**I want to** store the token in-memory with an expiration timestamp  
**So that** I don’t need to persist it or use cookies for validation  

---

## 📜 User Role: Administrator

### US06 – View All Identifiers
**As an** administrator  
**I want to** see a list of all identifiers with their metadata  
**So that** I can monitor all usage in one place  

### US07 – Edit Identifier Value
**As an** administrator  
**I want to** change the value of an identifier  
**So that** I can correct or manage identifiers  

### US08 – Delete Identifier
**As an** administrator  
**I want to** remove an identifier from the system  
**So that** I can clean up invalid or outdated entries  

---

## 📈 User Role: Activity Logger

### US09 – Log Identifier Creation
**As the** system  
**I want to** add a 'created' entry to the activity timeline when a new identifier is saved  
**So that** we can track its origin accurately  

### US10 – Log SSO Usage
**As the** system  
**I want to** log a 'used' activity with a timestamp and source URL  
**So that** I can trace when and where the identifier was used  

### US11 – Log Identifier Update
**As the** system  
**I want to** record an 'updated' activity when the identifier value changes  
**So that** history is preserved  

---

## ✅ Acceptance Criteria Summary

| ID    | Criteria                                                                 |
|-------|--------------------------------------------------------------------------|
| US01  | Input accepts any UTF-8 character                                        |
| US02  | Reusing an identifier results in a new token                             |
| US03  | New identifier is stored and token issued                                |
| US04  | Tokens are valid for exactly 10 minutes                                  |
| US05  | Tokens are stored in a temporary in-memory structure                     |
| US06  | Admin can access `/admin` to view all identifiers                        |
| US07  | Admin can edit and update identifier values                              |
| US08  | Admin can delete an identifier                                           |
| US09  | All new identifiers include a 'created' activity                         |
| US10  | Each token issue logs a 'used' event with timestamp and optional source  |
| US11  | Identifier changes trigger an 'updated' log entry                        |

---

### 🔖 v0.2.0
📅 Released: 2025-06-09T15:13:22.751Z

# thanperfect – User Stories

> 📅 Last updated: 2025-06-09T15:04:28.268Z  
> 📌 Version: v0.2.0


This document describes detailed user stories to guide the development of the `thanperfect` minimal SSO system. Each story follows the standard "As a [user], I want [feature], so that [benefit]" format.

---

## 🧑‍💻 User Role: Visitor

### US01 – Submit an Identifier
**As a** visitor  
**I want to** type any string (e.g., ".", "❤️", "banana") into an input field and submit it  
**So that** I can receive a session token without registering or logging in  

### US02 – Receive Token for Known Identifier
**As a** returning visitor  
**I want to** receive a new session token if I enter an identifier that already exists  
**So that** I can reuse my previous identity  

### US03 – Receive Token for New Identifier
**As a** new visitor  
**I want to** receive a new session token if I enter a new identifier  
**So that** I can immediately start using the system without approval  

---

## 🔐 User Role: Session System

### US04 – Create a Temporary Token
**As the** system  
**I want to** generate a secure 10-minute token after identifier submission  
**So that** the user session can be validated temporarily  

### US05 – Store Session Server-side
**As the** system  
**I want to** store the token in-memory with an expiration timestamp  
**So that** I don’t need to persist it or use cookies for validation  

---

## 📜 User Role: Administrator

### US06 – View All Identifiers
**As an** administrator  
**I want to** see a list of all identifiers with their metadata  
**So that** I can monitor all usage in one place  

### US07 – Edit Identifier Value
**As an** administrator  
**I want to** change the value of an identifier  
**So that** I can correct or manage identifiers  

### US08 – Delete Identifier
**As an** administrator  
**I want to** remove an identifier from the system  
**So that** I can clean up invalid or outdated entries  

---

## 📈 User Role: Activity Logger

### US09 – Log Identifier Creation
**As the** system  
**I want to** add a 'created' entry to the activity timeline when a new identifier is saved  
**So that** we can track its origin accurately  

### US10 – Log SSO Usage
**As the** system  
**I want to** log a 'used' activity with a timestamp and source URL  
**So that** I can trace when and where the identifier was used  

### US11 – Log Identifier Update
**As the** system  
**I want to** record an 'updated' activity when the identifier value changes  
**So that** history is preserved  

---

## ✅ Acceptance Criteria Summary

| ID    | Criteria                                                                 |
|-------|--------------------------------------------------------------------------|
| US01  | Input accepts any UTF-8 character                                        |
| US02  | Reusing an identifier results in a new token                             |
| US03  | New identifier is stored and token issued                                |
| US04  | Tokens are valid for exactly 10 minutes                                  |
| US05  | Tokens are stored in a temporary in-memory structure                     |
| US06  | Admin can access `/admin` to view all identifiers                        |
| US07  | Admin can edit and update identifier values                              |
| US08  | Admin can delete an identifier                                           |
| US09  | All new identifiers include a 'created' activity                         |
| US10  | Each token issue logs a 'used' event with timestamp and optional source  |
| US11  | Identifier changes trigger an 'updated' log entry                        |

