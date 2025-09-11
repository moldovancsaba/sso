// Deprecated endpoint — removed in favor of admin cookie session
export default async function handler(req, res) {
  return res.status(410).json({
    error: 'Endpoint removed',
    message: 'Use DELETE /api/admin/login',
  })
}
