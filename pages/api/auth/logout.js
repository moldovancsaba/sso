// Deprecated username-based logout endpoint
// Use DELETE /api/admin/login to clear the admin cookie session
export default async function handler(req, res) {
  res.status(410).json({
    error: 'Endpoint removed',
    message: 'Use DELETE /api/admin/login to logout',
  })
}
