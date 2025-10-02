// Deprecated username-based login endpoint
// This route has been removed in favor of /api/admin/login (email + token)
export default async function handler(req, res) {
  res.status(410).json({
    error: 'Endpoint removed',
    message: 'Use POST /api/admin/login with email and admin token',
  })
}
