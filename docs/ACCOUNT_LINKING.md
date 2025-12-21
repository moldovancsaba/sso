# Account Linking System

**Version**: 5.28.0  
**Status**: Production Ready  
**Created**: 2025-12-21T00:00:00.000Z  
**Updated**: 2025-12-21T00:00:00.000Z

---

## Overview

The SSO Service implements a **Unified Account Linking System** that allows users to login with multiple authentication methods (Email+Password, Facebook, Google) while maintaining a single account per email address.

### Key Principle
**One person, one email = one account**

Regardless of which login method a user chooses, if they use the same email address, they will access the same account with all their data, sessions, and connected services.

---

## User Experience

### Scenario 1: Registration After Social Login

**User journey:**
1. User logs in with Facebook using email `user@example.com`
2. Account is created with Facebook provider only
3. User later tries to register with email+password using the same email
4. System **adds password** to existing Facebook account instead of rejecting
5. User can now login with either Facebook or email+password

**What the user sees:**
- Registration form shows success message: "Password added to your account successfully. You can now login with email+password or your social account."
- Account dashboard shows both Facebook and Email+Password as linked methods

### Scenario 2: Social Login After Registration

**User journey:**
1. User registers with email+password using `user@example.com`
2. Account is created with password only
3. User later logs in with Google using the same email
4. System **automatically links** Google to existing account
5. User can now login with either email+password or Google

**What the user sees:**
- Login succeeds seamlessly without any special messages
- Account dashboard shows both Email+Password and Google as linked methods

### Scenario 3: Multiple Social Providers

**User journey:**
1. User logs in with Facebook using `user@example.com`
2. User later logs in with Google using the same email
3. System automatically links Google to existing Facebook account
4. User can login with either Facebook or Google

**What the user sees:**
- Seamless login with both providers
- Account dashboard shows both Facebook and Google as linked methods

### Scenario 4: Password Login Attempt for Social-Only Account

**User journey:**
1. User created account with Google only
2. User tries to login with email+password
3. System detects password is not set and provides helpful guidance

**What the user sees:**
- Error message: "This account was created with Google. Please login with Google, or register a password using the registration form."
- Clear indication of which login methods are available

---

## Technical Implementation

### Architecture Components

#### 1. Unified Library (`lib/accountLinking.mjs`)

Centralized account linking logic with the following functions:

**`findUserByEmail(email)`**
- Finds user by email regardless of login method
- Case-insensitive email lookup
- Returns user object or null

**`getUserLoginMethods(user)`**
- Returns array of available login methods: `['password', 'facebook', 'google']`
- Checks passwordHash field and socialProviders object
- Used for UI display and validation

**`canLoginWithPassword(user)`**
- Checks if user has password set
- Returns boolean
- Used in login validation

**`addPasswordToAccount(userId, password)`**
- Adds password to existing social-only account
- Hashes password with bcrypt
- Updates user record with passwordHash
- Enables account linking during registration

**`linkLoginMethod(user, provider, providerData)`**
- Links social provider to existing account
- Merges provider data into socialProviders object
- Updates timestamps
- Used by Facebook/Google OAuth callbacks

**`getAccountLinkingSummary(email)`**
- Comprehensive account status
- Returns all linked methods and account details
- Useful for debugging and admin tools

#### 2. Enhanced Registration (`pages/api/public/register.js`)

**New behavior:**
- Checks if email already exists with `findUserByEmail()`
- If user has password → Returns 409 error "Account already exists"
- If user has social-only → Adds password with `addPasswordToAccount()`
- Returns success with `isAccountLinking: true` flag

**Response format:**
```json
{
  "success": true,
  "message": "Password added to your account successfully...",
  "isAccountLinking": true,
  "loginMethods": ["facebook", "password"],
  "user": { ... }
}
```

#### 3. Enhanced Login (`pages/api/public/login.js`)

**New behavior:**
- Checks if user can login with password using `canLoginWithPassword()`
- If no password set → Returns helpful error with available methods
- Includes `availableLoginMethods` in error response

**Error response:**
```json
{
  "error": "Password not set",
  "message": "This account was created with Facebook. Please login with Facebook, or register a password using the registration form.",
  "availableLoginMethods": ["facebook"]
}
```

#### 4. Account Dashboard (`pages/account.js`)

**New section: Login Methods**
- Displays badges for each authentication method
- Shows linked status (linked vs. not linked)
- Color-coded badges:
  - Email+Password: Purple (#667eea)
  - Facebook: Blue (#1877f2)
  - Google: Red (#db4437)
- Helpful tip about linking multiple methods

**Server-side rendering:**
- Fetches `loginMethods` in `getServerSideProps`
- Passes to client as prop
- No additional API calls needed

#### 5. Social OAuth Integration

**Facebook (`lib/facebook.mjs`):**
- Line 174-210: Automatic account linking
- Checks if email exists with `findUserByEmail()`
- Links Facebook to existing account if found
- Creates new account if not found

**Google (`lib/google.mjs`):**
- Line 180-217: Automatic account linking
- Same pattern as Facebook
- Checks email, links or creates

---

## Data Model

### publicUsers Collection

```javascript
{
  id: "uuid",                      // Application-level UUID
  _id: ObjectId,                   // MongoDB internal ID
  email: "user@example.com",       // Unique, case-insensitive
  name: "User Name",
  
  // Email+Password authentication
  passwordHash: "...",             // bcrypt hash (optional)
  emailVerified: true,
  
  // Social authentication providers
  socialProviders: {
    facebook: {
      id: "fb-user-id",
      email: "user@example.com",
      name: "User Name",
      picture: "https://...",
      linkedAt: "2025-12-21T00:00:00.000Z",
      lastLoginAt: "2025-12-21T00:00:00.000Z"
    },
    google: {
      id: "google-user-id",
      email: "user@example.com",
      name: "User Name",
      picture: "https://...",
      emailVerified: true,
      linkedAt: "2025-12-21T00:00:00.000Z",
      lastLoginAt: "2025-12-21T00:00:00.000Z"
    }
  },
  
  // Computed from passwordHash and socialProviders (not stored)
  // loginMethods: ["password", "facebook", "google"]
  
  createdAt: "2025-12-21T00:00:00.000Z",
  updatedAt: "2025-12-21T00:00:00.000Z",
  lastLoginAt: "2025-12-21T00:00:00.000Z"
}
```

**Key fields:**
- `passwordHash` — Optional, only present if user registered with email+password
- `socialProviders` — Object containing linked social providers
- `email` — Primary identifier, case-insensitive unique index

---

## Migration Guide

### For Existing Systems with Duplicates

If your system has duplicate accounts (multiple accounts with same email), use the migration script:

#### Step 1: Preview Changes (Dry Run)

```bash
DRY_RUN=true node scripts/merge-duplicate-accounts.mjs
```

This will:
- Show which accounts will be merged
- Display which account will be kept (oldest one)
- Preview social providers and password transfers
- **Not make any changes**

#### Step 2: Review Output

Check the output carefully:
```
=== Merge Duplicate Accounts Migration ===
Mode: DRY RUN (preview only)
Found 3 email addresses with duplicate accounts
  user1@example.com: 2 accounts
  user2@example.com: 3 accounts
  user3@example.com: 2 accounts
```

#### Step 3: Apply Migration

Once satisfied with the preview:

```bash
node scripts/merge-duplicate-accounts.mjs
```

This will:
- Keep the oldest account for each email
- Merge all social providers into the primary account
- Transfer passwordHash if needed
- Transfer all sessions, OAuth tokens, and authorizations
- Delete duplicate accounts

#### Migration Safety

The script is **idempotent** — safe to run multiple times. If no duplicates are found:
```
✅ No duplicate accounts found!
```

---

## Testing Scenarios

### Scenario 1: Social → Email+Password

1. Login with Facebook using `test1@example.com`
2. Check account dashboard — should show Facebook as linked
3. Go to registration page
4. Register with `test1@example.com` and a password
5. Should see success message about password being added
6. Logout
7. Login with email+password — should succeed
8. Check account dashboard — should show both Facebook and Email+Password

### Scenario 2: Email+Password → Social

1. Register with email+password using `test2@example.com`
2. Check account dashboard — should show Email+Password as linked
3. Logout
4. Login with Google using `test2@example.com`
5. Should succeed without any special messages
6. Check account dashboard — should show both Email+Password and Google

### Scenario 3: Facebook → Google

1. Login with Facebook using `test3@example.com`
2. Check account dashboard — should show Facebook as linked
3. Logout
4. Login with Google using `test3@example.com`
5. Should succeed
6. Check account dashboard — should show both Facebook and Google

### Scenario 4: Password Login for Social-Only

1. Login with Facebook using `test4@example.com`
2. Logout
3. Try to login with email+password using `test4@example.com`
4. Should see error: "This account was created with Facebook..."
5. Error should list available methods

### Scenario 5: Duplicate Registration Prevention

1. Register with email+password using `test5@example.com`
2. Logout
3. Try to register again with `test5@example.com`
4. Should see error: "An account with this email already exists. Please login instead."

---

## API Changes Summary

### Modified Endpoints

#### `POST /api/public/register`

**New behavior:**
- Adds password to social-only accounts instead of rejecting
- Returns `isAccountLinking: true` and `loginMethods` in response

**New response fields:**
```json
{
  "isAccountLinking": true,
  "loginMethods": ["facebook", "password"]
}
```

#### `POST /api/public/login`

**New error response for social-only accounts:**
```json
{
  "error": "Password not set",
  "message": "This account was created with Facebook...",
  "availableLoginMethods": ["facebook"]
}
```

#### `GET /api/sso/validate`

No changes to API, but underlying logic uses account linking helpers.

---

## Logging and Audit

### Registration Events

**Social account → Email+Password:**
```javascript
{
  event: 'account_linking_success',
  userId: 'uuid',
  email: 'user@example.com',
  isAccountLinking: true,
  loginMethods: ['facebook', 'password']
}
```

### Login Events

**Password login attempt for social-only:**
```javascript
{
  event: 'public_login_social_only',
  userId: 'uuid',
  email: 'user@example.com',
  availableMethods: ['facebook']
}
```

**Successful login:**
```javascript
{
  event: 'public_login_success',
  userId: 'uuid',
  email: 'user@example.com',
  loginMethod: 'password',
  availableMethods: ['facebook', 'password']
}
```

---

## Security Considerations

### Email Verification

- Social providers (Facebook, Google) provide pre-verified emails
- Email+password registration requires email verification
- Account linking inherits verification status from any verified method

### Password Security

- Passwords are hashed with bcrypt (12 rounds)
- Password requirements: Minimum 8 characters
- Adding password to social account follows same security rules

### Session Management

- Sessions are tied to `userId` (UUID), not email
- Account linking does not invalidate existing sessions
- All sessions remain valid after linking

### OAuth Security

- State parameter prevents CSRF attacks
- Tokens are single-use and time-limited
- Refresh tokens follow OAuth 2.0 best practices

---

## Troubleshooting

### Issue: User sees "Account already exists" when trying to register

**Cause:** User already has an account with password set

**Solution:** User should login instead of registering

**How to verify:**
```javascript
const { getAccountLinkingSummary } = require('../lib/accountLinking.mjs')
const summary = await getAccountLinkingSummary('user@example.com')
console.log(summary)
```

### Issue: User can't login with password but registered with email

**Cause:** User created account via social provider first

**Solution:** User should:
1. Login with their social provider (Facebook or Google)
2. Go to registration page
3. Register with their email and desired password
4. Now they can login with either method

**How to fix manually (admin only):**
```javascript
const { addPasswordToAccount } = require('../lib/accountLinking.mjs')
await addPasswordToAccount(userId, 'temporary-password-123')
// Tell user to login with temporary password and change it
```

### Issue: Duplicate accounts exist for same email

**Cause:** Accounts were created before account linking was implemented

**Solution:** Run migration script:
```bash
DRY_RUN=true node scripts/merge-duplicate-accounts.mjs  # Preview
node scripts/merge-duplicate-accounts.mjs                # Apply
```

---

## Future Enhancements

### Potential Additions

1. **Manual Account Linking**
   - UI flow to link social providers from account dashboard
   - User initiates OAuth flow while logged in
   - Provider is added to existing account

2. **Account Unlinking**
   - Allow users to remove linked methods
   - Require at least one method remains active
   - Confirmation prompt before unlinking

3. **Email Change with Re-verification**
   - Allow users to change their email
   - Re-verify with all linked providers
   - Update email across all linked methods

4. **Login Method History**
   - Track which method was used for each login
   - Display in account dashboard
   - Useful for security auditing

5. **Multiple Email Addresses**
   - Link multiple emails to one account
   - Designate primary email
   - Secondary emails for recovery

---

## References

### Related Documentation
- `README.md` — Project overview
- `ARCHITECTURE.md` — System architecture
- `WARP.md` — Development guide
- `docs/FACEBOOK_LOGIN_SETUP.md` — Facebook OAuth setup
- `docs/GOOGLE_LOGIN_SETUP.md` — Google OAuth setup

### Related Code
- `lib/accountLinking.mjs` — Core account linking logic
- `lib/facebook.mjs` — Facebook OAuth integration
- `lib/google.mjs` — Google OAuth integration
- `pages/api/public/register.js` — Enhanced registration
- `pages/api/public/login.js` — Enhanced login
- `pages/account.js` — Account dashboard
- `scripts/merge-duplicate-accounts.mjs` — Migration tool

---

## Support

For questions or issues related to account linking:

1. Check this documentation
2. Review WARP.md for development patterns
3. Check MongoDB for account state: `db.publicUsers.findOne({ email: 'user@example.com' })`
4. Review logs for account linking events
5. Contact system administrator

---

**Last Updated**: 2025-12-21T00:00:00.000Z  
**Author**: moldovancsaba  
**Status**: Production Ready
