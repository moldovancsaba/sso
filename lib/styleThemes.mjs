/**
 * Style Themes Library
 * 
 * WHAT: Manages style/theme configurations stored in MongoDB
 * WHY: Provides centralized, database-driven styling for all admin pages
 * HOW: CRUD operations on styleThemes collection with validation and defaults
 */

import { randomUUID } from 'crypto'

/**
 * WHAT: Default theme configuration with all 65+ colorable elements
 * WHY: Provides fallback values and structure for new themes
 */
export const defaultTheme = {
  id: 'default',
  name: 'Default Theme',
  description: 'Standard SSO admin theme',
  isActive: true,
  colors: {
    // Page Structure
    pageBackground: '#FFFFFF',
    containerBackground: '#FFFFFF',
    
    // Header Section
    pageTitle: '#000000',
    subtitle: '#666666',
    backLink: '#667eea',
    
    // Cards
    cardBackground: '#FFFFFF',
    cardBorder: '#dddddd',
    cardShadow: 'rgba(0, 0, 0, 0.1)',
    cardHoverBorder: '#cccccc',
    
    // Form Elements
    labelText: '#000000',
    inputBorder: '#dddddd',
    inputBackground: '#FFFFFF',
    inputText: '#000000',
    inputFocus: '#667eea',
    
    // Text Colors
    textPrimary: '#000000',
    textSecondary: '#666666',
    textTertiary: '#999999',
    textInverse: '#FFFFFF',
    
    // Event Badges & Status
    statusSuccess: '#4caf50',
    statusError: '#f44336',
    statusInfo: '#2196f3',
    statusWarning: '#ff9800',
    statusDefault: '#999999',
    
    // Message Backgrounds
    successBackground: '#e8f5e9',
    successBorder: '#81c784',
    successText: '#2e7d32',
    errorBackground: '#ffeeee',
    errorBorder: '#ffcccc',
    errorText: '#cc3333',
    warningBackground: '#fff3e0',
    warningBorder: '#ffb74d',
    warningText: '#f57c00',
    infoBackground: '#e3f2fd',
    infoBorder: '#90caf9',
    infoText: '#1976d2',
    
    // Buttons
    buttonPrimary: '#667eea',
    buttonPrimaryHover: '#5568d3',
    buttonPrimaryText: '#FFFFFF',
    buttonSecondary: '#e0e0e0',
    buttonSecondaryHover: '#d0d0d0',
    buttonSecondaryText: '#000000',
    buttonDanger: '#f44336',
    buttonDangerHover: '#d32f2f',
    buttonDangerText: '#FFFFFF',
    buttonDisabled: '#999999',
    buttonDisabledText: '#FFFFFF',
    
    // Borders & Dividers
    borderSubtle: '#eeeeee',
    borderDefault: '#dddddd',
    borderStrong: '#cccccc',
    
    // Login Method Badges
    loginMethodEmail: '#667eea',
    loginMethodFacebook: '#1877f2',
    loginMethodGoogle: '#ea4335',
    
    // Modal
    modalOverlay: 'rgba(0, 0, 0, 0.7)',
    modalBackground: '#FFFFFF',
    modalShadow: 'rgba(0, 0, 0, 0.5)',
    
    // App Name Highlight
    appNameText: '#667eea',
    
    // Expanded Details
    expandedBorderTop: '#eeeeee',
    detailLabel: '#666666',
    detailValue: '#666666',
    monospaceText: '#666666',
    
    // Loading & Empty States
    loadingText: '#999999',
    emptyStateText: '#999999',
    
    // OAuth Clients (Dark Theme Elements)
    darkBackground: '#0b1021',
    darkCardBackground: '#12172b',
    darkCardBorder: '#22284a',
    darkText: '#e6e8f2',
    darkInputBackground: '#0b1021',
    darkButtonPrimary: '#4054d6',
    darkButtonSecondary: '#24306b',
    darkButtonDelete: '#8b1919',
    darkStatusActive: '#1e895a',
    darkStatusSuspended: '#8a6d3b',
    darkWarningBackground: '#211a0b',
    darkWarningBorder: '#8a6d3b',
    darkWarningText: '#ffc107'
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
}

/**
 * WHAT: Get all themes from database
 * WHY: Admin needs to view and manage multiple themes
 */
export async function getAllThemes(db) {
  const themes = await db.collection('styleThemes').find({}).toArray()
  
  // If no themes exist, insert default theme
  if (themes.length === 0) {
    await db.collection('styleThemes').insertOne({ ...defaultTheme })
    return [defaultTheme]
  }
  
  return themes
}

/**
 * WHAT: Get currently active theme
 * WHY: Frontend needs to know which theme to apply
 */
export async function getActiveTheme(db) {
  let theme = await db.collection('styleThemes').findOne({ isActive: true })
  
  // If no active theme, return default
  if (!theme) {
    theme = { ...defaultTheme }
    await db.collection('styleThemes').insertOne(theme)
  }
  
  return theme
}

/**
 * WHAT: Get theme by ID
 * WHY: Admin needs to edit specific themes
 */
export async function getThemeById(db, themeId) {
  const theme = await db.collection('styleThemes').findOne({ id: themeId })
  
  if (!theme) {
    throw new Error('Theme not found')
  }
  
  return theme
}

/**
 * WHAT: Create new theme
 * WHY: Admin wants to create custom themes
 */
export async function createTheme(db, themeData) {
  const now = new Date().toISOString()
  
  const newTheme = {
    id: randomUUID(),
    name: themeData.name || 'New Theme',
    description: themeData.description || '',
    isActive: false, // New themes are not active by default
    colors: {
      ...defaultTheme.colors,
      ...(themeData.colors || {})
    },
    createdAt: now,
    updatedAt: now
  }
  
  await db.collection('styleThemes').insertOne(newTheme)
  
  return newTheme
}

/**
 * WHAT: Update existing theme
 * WHY: Admin needs to modify theme colors
 */
export async function updateTheme(db, themeId, updates) {
  const now = new Date().toISOString()
  
  const updateData = {
    updatedAt: now
  }
  
  if (updates.name !== undefined) updateData.name = updates.name
  if (updates.description !== undefined) updateData.description = updates.description
  if (updates.colors !== undefined) {
    // Merge with existing colors to preserve all properties
    const existingTheme = await getThemeById(db, themeId)
    updateData.colors = {
      ...existingTheme.colors,
      ...updates.colors
    }
  }
  
  const result = await db.collection('styleThemes').updateOne(
    { id: themeId },
    { $set: updateData }
  )
  
  if (result.matchedCount === 0) {
    throw new Error('Theme not found')
  }
  
  return await getThemeById(db, themeId)
}

/**
 * WHAT: Set a theme as active (and deactivate others)
 * WHY: Only one theme should be active at a time
 */
export async function setActiveTheme(db, themeId) {
  const now = new Date().toISOString()
  
  // Verify theme exists
  const theme = await getThemeById(db, themeId)
  
  // Deactivate all themes
  await db.collection('styleThemes').updateMany(
    {},
    { $set: { isActive: false, updatedAt: now } }
  )
  
  // Activate the selected theme
  await db.collection('styleThemes').updateOne(
    { id: themeId },
    { $set: { isActive: true, updatedAt: now } }
  )
  
  return await getThemeById(db, themeId)
}

/**
 * WHAT: Delete a theme
 * WHY: Admin wants to remove unused themes
 * HOW: Prevents deletion of active theme or default theme
 */
export async function deleteTheme(db, themeId) {
  const theme = await getThemeById(db, themeId)
  
  // Prevent deletion of active theme
  if (theme.isActive) {
    throw new Error('Cannot delete active theme. Please activate another theme first.')
  }
  
  // Prevent deletion of default theme
  if (theme.id === 'default') {
    throw new Error('Cannot delete default theme')
  }
  
  const result = await db.collection('styleThemes').deleteOne({ id: themeId })
  
  if (result.deletedCount === 0) {
    throw new Error('Theme not found')
  }
  
  return { success: true, message: 'Theme deleted successfully' }
}

/**
 * WHAT: Validate theme color values
 * WHY: Ensure colors are valid hex, rgb, or rgba values
 */
export function validateColor(color) {
  if (!color) return false
  
  // Valid patterns: #FFF, #FFFFFF, rgb(), rgba()
  const hexPattern = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
  const rgbPattern = /^rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)$/
  const rgbaPattern = /^rgba\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*(0|1|0?\.\d+)\s*\)$/
  
  return hexPattern.test(color) || rgbPattern.test(color) || rgbaPattern.test(color)
}

/**
 * WHAT: Validate entire theme object
 * WHY: Ensure theme data is valid before saving
 */
export function validateTheme(theme) {
  const errors = []
  
  if (!theme.name || theme.name.trim().length === 0) {
    errors.push('Theme name is required')
  }
  
  if (theme.colors) {
    for (const [key, value] of Object.entries(theme.colors)) {
      if (!validateColor(value)) {
        errors.push(`Invalid color value for ${key}: ${value}`)
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}
