import { NextApiRequest, NextApiResponse } from 'next';

// HTML template for the check session iframe
const checkSessionHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <script>
    let clientId = '';
    let clientOrigin = '';
    let sessionState = '';

    function calculateSessionState(clientId, origin, salt, nowInSeconds) {
      const input = clientId + ' ' + origin + ' ' + salt + ' ' + nowInSeconds;
      // In a real implementation, you would use a proper hash function
      return btoa(input).replace(/=/g, '');
    }

    function checkSession() {
      // Get current session state from cookie or storage
      const currentState = sessionStorage.getItem('oidc_session');
      
      if (currentState !== sessionState) {
        sessionState = currentState;
        const msg = sessionState ? 'changed' : 'error';
        client.postMessage(msg, clientOrigin);
      }
    }

    function receiveMessage(e) {
      // Validate origin
      const expectedOrigin = clientOrigin || e.origin;
      if (e.origin !== expectedOrigin) {
        return;
      }

      // Parse client data
      const parts = e.data.split(' ');
      if (parts.length !== 2) {
        return;
      }

      clientId = parts[0];
      sessionState = parts[1];

      // Store client origin
      clientOrigin = e.origin;

      // Start checking session
      setInterval(checkSession, 3000);
    }

    window.addEventListener('message', receiveMessage, false);
  </script>
</head>
<body>
  <!-- Intentionally empty body -->
</body>
</html>
`;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Set security headers
  res.setHeader('Content-Security-Policy', "frame-ancestors 'self'");
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Content-Type', 'text/html');

  res.send(checkSessionHtml);
}
