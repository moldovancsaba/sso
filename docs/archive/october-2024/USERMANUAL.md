# User Manual

## Contents
1. [Getting Started](#getting-started)
2. [Basic Usage](#basic-usage)
3. [Admin Features](#admin-features)
4. [Troubleshooting](#troubleshooting)

## Getting Started

### First Time Setup
1. Visit the application at http://localhost:3000
2. The first user who registers automatically becomes an admin
3. Enter your username and click "Sign In"
4. You're now logged in and, if you're the first user, you have admin rights

### Regular Login
1. Enter your username
2. Click "Sign In"
3. If the username exists, you'll be logged in
4. If it's a new username, a new user account will be created

## Basic Usage

### Viewing Your Permissions
- After logging in, your permissions are displayed on the main screen
- Permissions include:
  - isAdmin: Full system access
  - canViewUsers: Ability to see user list
  - canManageUsers: Ability to modify users

### Logging Out
1. Click the "Sign Out" button at the bottom of the page
2. Your session will be cleared
3. You'll be returned to the login screen

## Admin Features

### User Management Dashboard
- Available only to users with admin rights
- Shows all registered users
- Each user card shows:
  - Username
  - Admin status
  - Management options

### Managing Users

#### Renaming Users
1. Click the username field in the user card
2. Enter the new username
3. Click outside the field or press Enter
4. The change is saved automatically

#### Toggling Admin Rights
1. Find the user you want to modify
2. Check/uncheck the "Admin Rights" checkbox
3. Changes are applied immediately
4. Note: You cannot modify your own admin rights

#### Deleting Users
1. Find the user you want to delete
2. Click the "Delete User" button
3. Confirm the deletion
4. Note: You cannot delete your own account

### Activity Tracking
- All actions are logged automatically:
  - User registrations
  - Permission changes
  - Username updates
  - User deletions
  - Login/logout events

## Troubleshooting

### Common Issues

#### Can't Modify Own Admin Rights
- This is by design
- Prevents accidental loss of admin access
- Ask another admin to modify your permissions

#### User Not Found
- Ensure you're using the correct username
- Check if the user hasn't been deleted
- Try refreshing the page

#### Changes Not Reflecting
1. Try refreshing the page
2. Log out and back in
3. Check your permissions
4. Contact another admin if issues persist
