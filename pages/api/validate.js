import { validateToken } from '../../lib/tokenStore';

export default function handler(req, res) {
  const token = req.query.token;
  const identifier = validateToken(token);
  if (!identifier) return res.status(401).json({ valid: false });
  res.json({ valid: true, identifier });
}
