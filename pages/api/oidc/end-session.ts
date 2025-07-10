import { NextApiRequest, NextApiResponse } from 'next';
import { Database } from '../../../lib/db/database';
import { KeyManager } from '../../../lib/oidc/keys';

interface EndSessionRequest {
  id_token_hint?: string;
  post_logout_redirect_uri?: string;
  state?: string;
  client_id?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    id_token_hint,
    post_logout_redirect_uri,
    state,
    client_id
  } = req.query as EndSessionRequest;

  try {
    // If id_token_hint is provided, verify it
    if (id_token_hint) {
      const keyManager = KeyManager.getInstance();
      const payload = await keyManager.verify(id_token_hint) as {
        azp?: string;
        aud?: string;
        sub: string;
      };

      // Verify client_id if provided
      if (client_id && payload.azp !== client_id && payload.aud !== client_id) {
        return res.status(400).json({ error: 'Invalid client_id' });
      }

      // Get user and verify session
      const db = await Database.getInstance();
      const user = await db.findUser(payload.sub);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Clear session
      res.setHeader('Set-Cookie', [
        'oidc_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=Lax',
        'oidc_state=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=Lax'
      ]);

      // If post_logout_redirect_uri is provided, validate it against registered URIs
      if (post_logout_redirect_uri) {
        const client = await db.validateOAuthClient(client_id!);
        if (!client || !client.redirectUris.includes(post_logout_redirect_uri)) {
          return res.status(400).json({ error: 'Invalid post_logout_redirect_uri' });
        }

        // Add state if provided
        const redirectUrl = state
          ? `${post_logout_redirect_uri}?state=${encodeURIComponent(state)}`
          : post_logout_redirect_uri;

        // Generate front-channel logout iframe HTML
        const iframeHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>Logout</title>
            <script>
              function logout() {
                // Clear local session storage
                sessionStorage.clear();
                localStorage.clear();
                
                // Notify parent window of logout completion
                window.parent.postMessage('logout_complete', '*');
                
                // Redirect to post-logout URL
                window.location.href = ${JSON.stringify(redirectUrl)};
              }
            </script>
          </head>
          <body onload="logout()">
            Logging out...
          </body>
          </html>
        `;

        res.setHeader('Content-Type', 'text/html');
        return res.send(iframeHtml);
      }

      // If no redirect URI, just show logout confirmation
      res.setHeader('Content-Type', 'text/html');
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Logged Out</title>
        </head>
        <body>
          <h1>Successfully logged out</h1>
        </body>
        </html>
      `);
    }

    // If no id_token_hint, just clear session and show logout page
    res.setHeader('Set-Cookie', [
      'oidc_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=Lax',
      'oidc_state=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=Lax'
    ]);

    res.setHeader('Content-Type', 'text/html');
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Logged Out</title>
      </head>
      <body>
        <h1>Successfully logged out</h1>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Error in end-session endpoint:', error);
    res.status(400).json({ error: 'Invalid request' });
  }
}
