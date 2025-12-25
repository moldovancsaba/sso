/**
 * Theme Management API - Single Theme Operations
 * 
 * WHAT: API endpoints for managing individual themes
 * WHY: Admins need to update, delete, and activate specific themes
 * HOW: GET/PATCH/DELETE for theme by ID, POST for activation
 */

import { getDb } from '../../../../lib/db.mjs'
import { requireUnifiedAdmin } from '../../../../lib/auth.mjs'
import { getThemeById, updateTheme, deleteTheme, setActiveTheme, validateTheme } from '../../../../lib/styleThemes.mjs'

export default async function handler(req, res) {
  try {
    // WHAT: Admin authentication required
    const admin = await requireUnifiedAdmin(req, res)
    if (!admin) return // requireUnifiedAdmin already sent error response

    const db = await getDb()
    const { themeId } = req.query

    if (!themeId) {
      return res.status(400).json({ error: 'Theme ID is required' })
    }

    if (req.method === 'GET') {
      // WHAT: Get single theme by ID
      const theme = await getThemeById(db, themeId)
      return res.status(200).json({ theme })
    }

    if (req.method === 'PATCH') {
      // WHAT: Update theme
      // WHY: Admin wants to modify theme properties or colors
      const { name, description, colors, activate } = req.body

      // If activate flag is set, activate this theme
      if (activate === true) {
        const theme = await setActiveTheme(db, themeId)
        return res.status(200).json({ 
          theme,
          message: 'Theme activated successfully'
        })
      }

      // Build update object
      const updates = {}
      if (name !== undefined) updates.name = name
      if (description !== undefined) updates.description = description
      if (colors !== undefined) updates.colors = colors

      // Validate if colors are being updated
      if (colors) {
        const validation = validateTheme({ name: 'temp', colors })
        if (!validation.isValid) {
          return res.status(400).json({ 
            error: 'Invalid color values',
            details: validation.errors 
          })
        }
      }

      // Update theme
      const updatedTheme = await updateTheme(db, themeId, updates)

      return res.status(200).json({ 
        theme: updatedTheme,
        message: 'Theme updated successfully'
      })
    }

    if (req.method === 'DELETE') {
      // WHAT: Delete theme
      // WHY: Admin wants to remove unused theme
      const result = await deleteTheme(db, themeId)

      return res.status(200).json(result)
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('Theme API error:', error)
    return res.status(500).json({ error: error.message || 'Internal server error' })
  }
}
