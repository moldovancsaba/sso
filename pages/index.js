import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from '../styles/home.module.css';

export default function Home() {
  const [username, setUsername] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);

  async function handleSignIn() {
    if (!username.trim()) {
      alert('Please enter a username');
      return;
    }

    try {
      // Try to register/login the user
      const response = await fetch('/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim() })
      });

      if (!response.ok) {
        throw new Error('Failed to sign in');
      }

      const data = await response.json();
      setCurrentUser(data.user);
      setIsLoggedIn(true);
      setUsername('');

      if (data.user.permissions.isAdmin) {
        loadUsers();
      }
    } catch (error) {
      alert('Error signing in: ' + error.message);
    }
  }

  async function handleSignOut() {
    try {
      await fetch('/api/users/logout', { method: 'POST' });
      setCurrentUser(null);
      setIsLoggedIn(false);
      setUsers([]);
    } catch (error) {
      alert('Error signing out: ' + error.message);
    }
  }

async function loadUsers() {
    try {
      const response = await fetch('/api/users');
      if (!response.ok) throw new Error('Failed to load users');
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      alert('Error loading users: ' + error.message);
    }
  }

  async function updateUsername(userId, newUsername) {
    if (!newUsername.trim()) return;
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: newUsername.trim() })
      });
      if (!response.ok) throw new Error('Failed to update username');
      loadUsers();
    } catch (error) {
      alert('Error updating username: ' + error.message);
    }
  }

  async function togglePermission(userId, permission, value) {
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAdmin: value })
      });
      if (!response.ok) throw new Error('Failed to update permissions');
      loadUsers();
    } catch (error) {
      alert('Error updating permissions: ' + error.message);
    }
  }

  async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      const response = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete user');
      loadUsers();
    } catch (error) {
      alert('Error deleting user: ' + error.message);
    }
  }

return (
    <div className={styles.container}>
<header className={styles.header}>
        <h1>DoneIsBetter SSO</h1>
        <p className={styles.subtitle}>Secure Single Sign-On Solution</p>

        <div className={styles.apiCard}>
          <h2>🔗 API Integration</h2>
          <p>Ready to integrate SSO into your application?</p>
          <div className={styles.apiLinks}>
            <Link href="/docs/api" className={styles.primaryButton}>
              API Documentation
            </Link>
            <Link href="/docs/quickstart" className={styles.secondaryButton}>
              Quick Start Guide
            </Link>
          </div>
          <div className={styles.apiExample}>
            <code>
              {`// Quick integration example
const sso = new SSOClient('https://sso.doneisbetter.com');
const session = await sso.validateSession();`}
            </code>
          </div>
        </div>
      </header>
      <div id="content">
        {!isLoggedIn ? (
          <div id="login-section">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
            />
            <button onClick={handleSignIn}>Sign In</button>
          </div>
        ) : (
          <div id="user-section">
            <p>Welcome, {currentUser?.username}!</p>
            {currentUser?.permissions && (
              <div id="user-permissions">
                <h3>Your Permissions:</h3>
                {Object.entries(currentUser.permissions).map(([key, value]) => (
                  <div key={key}>{key}: {String(value)}</div>
                ))}
              </div>
            )}
{currentUser?.permissions?.isAdmin && (
              <div id="admin-section">
                <h2>User Management</h2>
                <div className="users-grid">
                  {users.map(user => (
                    <div key={user._id} className="user-card">
                      <div className="user-header">
                        <input
                          type="text"
                          defaultValue={user.username}
                          onBlur={(e) => updateUsername(user._id, e.target.value)}
                          className="username-input"
                          placeholder="Username"
                        />
                      </div>
                      <div className="user-permissions">
                        <label className="permission-toggle">
                          <input
                            type="checkbox"
                            checked={user.permissions.isAdmin}
                            onChange={(e) => togglePermission(user._id, 'isAdmin', e.target.checked)}
                            disabled={user._id === currentUser.id}
                          />
                          Admin Rights
                        </label>
                      </div>
                      {user._id !== currentUser.id && (
                        <button 
                          onClick={() => deleteUser(user._id)}
                          className="delete-btn"
                        >
                          Delete User
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <button onClick={handleSignOut} className="sign-out-btn">
              Sign Out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

