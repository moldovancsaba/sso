/**
 * Theme Management API - List and Create Themes
 * 
 * WHAT: API endpoints for managing style themes
 * WHY: Admins need to create, view, and manage custom themes
 * HOW: GET returns all themes, POST creates new theme
 */

import { getDb } from '../../../../lib/db.mjs'
import { requireUnifiedAdmin } from '../../../../lib/auth.mjs'
import { getAllThemes, createTheme, validateTheme } from '../../../../lib/styleThemes.mjs'

export default async function handler(req, res) {
  try {
    // WHAT: Admin authentication required
    // WHY: Only admins can manage themes
    const admin = await requireUnifiedAdmin(req, res)
    if (!admin) return // requireUnifiedAdmin already sent error response

    const db = await getDb()

    if (req.method === 'GET') {
      // WHAT: Get all themes
      const themes = await getAllThemes(db)
      return res.status(200).json({ themes })
    }

    if (req.method === 'POST') {
      // WHAT: Create new theme
      // WHY: Admin wants to create custom theme
      // HOW: Validate input, create theme with default colors merged with provided colors

      const { name, description, colors } = req.body

      // Validate required fields
      if (!name || name.trim().length === 0) {
        return res.status(400).json({ error: 'Theme name is required' })
      }

      // Build theme object
      const themeData = {
        name: name.trim(),
        description: description?.trim() || '',
        colors: colors || {}
      }

      // Validate theme
      const validation = validateTheme(themeData)
      if (!validation.isValid) {
        return res.status(400).json({ 
          error: 'Invalid theme data',
          details: validation.errors 
        })
      }

      // Create theme
      const newTheme = await createTheme(db, themeData)

      return res.status(201).json({ 
        theme: newTheme,
        message: 'Theme created successfully'
      })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('Theme API error:', error)
    return res.status(500).json({ error: error.message || 'Internal server error' })
  }
}
