/**
 * pages/api/resource-passwords/index.js
 * WHAT: Generate/retrieve resource password + shareable link (POST), validate password (PUT).
 * WHY: Provide generic passwording for resources with admin-session bypass.
 */
import { runCors } from '../../../lib/cors.mjs'
import { getAdminUser } from '../../../lib/auth.mjs'
import { generateShareableLink, getOrCreateResourcePassword, validateAnyPassword } from '../../../lib/resourcePasswords.mjs'

export default async function handler(req, res) {
  if (runCors(req, res)) return

  if (req.method === 'POST') {
    try {
      const { resourceId, resourceType, regenerate = false } = req.body || {}
      if (!resourceId || !resourceType) {
        return res.status(400).json({ success: false, error: 'resourceId and resourceType are required' })
      }

      // Generate or retrieve password
      const resourcePassword = await getOrCreateResourcePassword(resourceId, resourceType, regenerate)

      // Build base URL from headers, fallback to env
      const protocol = (req.headers['x-forwarded-proto'] || '').toString() || 'https'
      const host = (req.headers['x-forwarded-host'] || req.headers['host'] || '').toString() || 'localhost:3000'
      const baseUrl = `${protocol}://${host}` || process.env.SSO_BASE_URL || ''

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
      if (!resourceId || !resourceType || !password) {
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

