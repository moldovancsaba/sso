// Deprecated endpoint — a logout must end both session models, so there is no single
// replacement: call POST /api/public/logout and DELETE /api/admin/login, or send the browser
// to /logout (which does both). Pointing here at DELETE /api/admin/login alone was wrong —
// that clears only the legacy admin-session cookie.
export default async function handler(req, res) {
  return res.status(410).json({
    error: 'Endpoint removed',
    message: 'Use POST /api/public/logout and DELETE /api/admin/login, or navigate to /logout',
  })
}
