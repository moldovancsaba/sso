// Session status check endpoint
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Check session from the request
    const session = req.session;

    if (!session || !session.userId) {
      return res.status(200).json({ status: 'expired' });
    }

    // Check session expiry
    const now = new Date();
    const sessionExpiry = new Date(session.expiresAt);

    if (now > sessionExpiry) {
      return res.status(200).json({ status: 'expired' });
    }

    return res.status(200).json({ status: 'active' });
  } catch (error) {
    console.error('Error checking session status:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
