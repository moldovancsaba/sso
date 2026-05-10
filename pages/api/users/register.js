// Deprecated endpoint — user self-registration removed
// Use POST /api/admin/users to create admin users (admin only)
export default async function handler(req, res) {
  return res.status(410).json({
    error: 'Endpoint removed',
    message: 'Use POST /api/admin/users (admin only)',
  })
}
