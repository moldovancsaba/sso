/**
 * pages/api/resource-passwords/index.js
 * WHAT: Generate/retrieve resource password + shareable link (POST), validate password (PUT).
 * WHY: Provide generic passwording for resources with admin-session bypass.
 */
import { runCors } from '../../../lib/cors.mjs'
import { getAdminUser } from '../../../lib/auth.mjs'
import { validateRequestOrigin } from '../../../lib/middleware/csrf.mjs'
import { generateShareableLink, getOrCreateResourcePassword, validateAnyPassword } from '../../../lib/resourcePasswords.mjs'
import { getBaseUrl } from '../../../lib/baseUrl.mjs'

export default async function handler(req, res) {
  if (runCors(req, res)) return

  if (req.method === 'POST') {
    try {
      // WHAT: Reject cross-origin requests, then require admin auth
      // WHY: This handler had no auth check at all — anyone could POST an arbitrary
      //      resourceId/resourceType and get the (possibly newly-regenerated) plaintext
      //      password back. PUT (below) is intentionally left open to any caller who knows
      //      the password — that's the whole point of a shareable resource password — so it
      //      isn't driven by ambient cookie authority and doesn't need this check.
      const originCheck = validateRequestOrigin(req)
      if (!originCheck.valid) {
        return res.status(403).json({ success: false, error: 'Request origin not allowed' })
      }

      const admin = await getAdminUser(req)
      if (!admin) {
        return res.status(401).json({ success: false, error: 'Admin authentication required' })
      }

      const { resourceId, resourceType, regenerate = false } = req.body || {}
      if (typeof resourceId !== 'string' || !resourceId || typeof resourceType !== 'string' || !resourceType) {
        return res.status(400).json({ success: false, error: 'resourceId and resourceType are required' })
      }

      // Generate or retrieve password
      const resourcePassword = await getOrCreateResourcePassword(resourceId, resourceType, regenerate)

      // WHAT: Canonical base URL, never derived from request headers.
      // WHY: The old header-derived value fed x-forwarded-host verbatim into a
      //      generated credential link (host-header injection), and its
      //      SSO_BASE_URL fallback was unreachable — a template literal is
      //      never falsy.
      const baseUrl = getBaseUrl()

      // Generate shareable link (generic URL container)
      const shareableLink = await generateShareableLink(resourceId, resourceType, baseUrl)

      return res.status(200).json({
        success: true,
        shareableLink,
        resourcePassword: {
          resourceId: resourcePassword.resourceId,
          resourceType: resourcePassword.resourceType,
          password: resourcePassword.password,
          createdAt: resourcePassword.createdAt,
          usageCount: resourcePassword.usageCount,
        },
      })
    } catch (error) {
      console.error('Failed to generate resource password:', error)
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate resource password',
      })
    }
  }

  if (req.method === 'PUT') {
    try {
      const { resourceId, resourceType, password } = req.body || {}
      if (
        typeof resourceId !== 'string' || !resourceId ||
        typeof resourceType !== 'string' || !resourceType ||
        typeof password !== 'string' || !password
      ) {
        return res.status(400).json({ success: false, error: 'resourceId, resourceType, and password are required' })
      }

      // Admin bypass: if request has a valid admin session, accept immediately
      const admin = await getAdminUser(req)
      if (admin) {
        return res.status(200).json({
          success: true,
          isValid: true,
          isAdmin: true,
          message: 'Admin session accepted',
        })
      }

      // Validate password (resource-specific)
      const validation = await validateAnyPassword(resourceId, resourceType, password)

      if (validation.isValid) {
        return res.status(200).json({
          success: true,
          isValid: true,
          isAdmin: validation.isAdmin,
          message: validation.isAdmin ? 'Admin password accepted' : 'Resource password accepted',
        })
      } else {
        return res.status(401).json({
          success: false,
          isValid: false,
          isAdmin: false,
          error: 'Invalid password',
        })
      }
    } catch (error) {
      console.error('Failed to validate resource password:', error)
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to validate password',
      })
    }
  }

  res.setHeader('Allow', 'POST, PUT, OPTIONS')
  return res.status(405).end(`Method ${req.method} Not Allowed`)
}

