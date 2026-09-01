// Deprecated username-based logout endpoint — see pages/api/users/logout.js for why a single
// replacement endpoint would be misleading.
export default async function handler(req, res) {
  res.status(410).json({
    error: 'Endpoint removed',
    message: 'Use POST /api/public/logout and DELETE /api/admin/login, or navigate to /logout',
  })
}
