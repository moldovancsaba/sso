/**
 * Active Theme API - Public Endpoint
 * 
 * WHAT: Public API to fetch currently active theme
 * WHY: All pages need to know the active theme to apply correct styling
 * HOW: Returns active theme without authentication requirement
 */

import { getDb } from '../../../lib/db.mjs'
import { getActiveTheme } from '../../../lib/styleThemes.mjs'

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' })
    }

    const db = await getDb()
    
    // WHAT: Get active theme
    // WHY: Public pages and components need theme data to render correctly
    const theme = await getActiveTheme(db)

    return res.status(200).json({ theme })
  } catch (error) {
    console.error('Active theme API error:', error)
    return res.status(500).json({ error: error.message || 'Internal server error' })
  }
}
