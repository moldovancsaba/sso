// Deprecated endpoint — replaced by /api/admin/users/[id]
export default async function handler(req, res) {
  res.setHeader('Allow', 'GET, PATCH, DELETE')
  return res.status(410).json({
    error: 'Endpoint removed',
    message: 'Use /api/admin/users/[id] for user management',
  })
}
