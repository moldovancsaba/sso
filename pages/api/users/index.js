// Deprecated endpoint — replaced by /api/admin/users
// Removed rather than migrated: it gated on getAdminUser alone, which the current OAuth admin
// login never satisfies, and nothing in this repo or its docs called it.
export default async function handler(req, res) {
  return res.status(410).json({
    error: 'Endpoint removed',
    message: 'Use /api/admin/users for user listing',
  })
}
