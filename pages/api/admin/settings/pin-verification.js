/**
 * pages/api/admin/settings/pin-verification.js
 * WHAT: API endpoint to enable/disable PIN verification for login
 * WHY: Allow super-admins to toggle PIN verification without changing environment variables
 */
import { requireAdmin } from '../../../../lib/auth.mjs'
import { getDb } from '../../../../lib/db.mjs'

const SETTINGS_COLLECTION = 'systemSettings'
const SETTING_KEY = 'pin_verification_enabled'

/**
 * getSettings
 * WHAT: Get or create the system settings document
 * WHY: Centralized settings storage in MongoDB
 */
async function getSettings() {
  const db = await getDb()
  const col = db.collection(SETTINGS_COLLECTION)
  
  let settings = await col.findOne({ _id: 'system' })
  
  if (!settings) {
    // WHAT: Create default settings document if it doesn't exist
    // WHY: First-time setup or after database reset
    settings = {
      _id: 'system',
      pin_verification_enabled: true, // Default: enabled
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    await col.insertOne(settings)
  }
  
  return settings
}

/**
 * updateSetting
 * WHAT: Update a specific setting value
 * WHY: Persist setting changes across server restarts
 */
async function updateSetting(key, value) {
  const db = await getDb()
  const col = db.collection(SETTINGS_COLLECTION)
  
  await col.updateOne(
    { _id: 'system' },
    {
      $set: {
        [key]: value,
        updatedAt: new Date().toISOString(),
      },
    },
    { upsert: true }
  )
}

export default async function handler(req, res) {
  // WHAT: Verify admin authentication
  // WHY: Only admins should be able to view/change system settings
  const admin = await requireAdmin(req, res)
  if (!admin) return
  
  try {
    if (req.method === 'GET') {
      // WHAT: Return current PIN verification status
      // WHY: UI needs to display current state of the toggle
      const settings = await getSettings()
      
      // Check environment variable override (DISABLE_LOGIN_PIN=true disables PIN)
      const envDisabled = process.env.DISABLE_LOGIN_PIN === 'true'
      const dbEnabled = settings[SETTING_KEY] !== false
      
      return res.status(200).json({
        enabled: dbEnabled && !envDisabled,
        source: envDisabled ? 'environment' : 'database',
        note: envDisabled ? 'Disabled by DISABLE_LOGIN_PIN environment variable' : null,
      })
    }
    
    if (req.method === 'POST') {
      // WHAT: Require super-admin role for changing settings
      // WHY: Security-critical setting that affects all users
      if (admin.role !== 'super-admin') {
        return res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'Super-admin role required to change settings',
          },
        })
      }
      
      const { enabled } = req.body
      
      if (typeof enabled !== 'boolean') {
        return res.status(400).json({
          error: {
            code: 'INVALID_INPUT',
            message: 'enabled must be a boolean',
          },
        })
      }
      
      // WHAT: Check for environment variable override
      // WHY: Environment variables take precedence over database settings
      if (process.env.DISABLE_LOGIN_PIN === 'true' && enabled) {
        return res.status(409).json({
          error: {
            code: 'ENV_OVERRIDE',
            message: 'Cannot enable PIN verification: DISABLE_LOGIN_PIN environment variable is set to true',
          },
        })
      }
      
      // WHAT: Update setting in database
      // WHY: Persist setting change across server restarts
      await updateSetting(SETTING_KEY, enabled)
      
      return res.status(200).json({
        success: true,
        enabled,
        message: `PIN verification ${enabled ? 'enabled' : 'disabled'} successfully`,
      })
    }
    
    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: 'Method not allowed',
      },
    })
  } catch (error) {
    console.error('PIN verification settings error:', error)
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to manage PIN verification settings',
      },
    })
  }
}
