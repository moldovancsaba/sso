/**
 * ThemeProvider - React Context for Theme Management
 * 
 * WHAT: Provides theme colors to all components via React Context
 * WHY: Centralizes theme management and enables real-time theme switching
 * HOW: Fetches active theme on mount, provides colors and utilities via context
 */

import { createContext, useContext, useState, useEffect } from 'react'

// WHAT: Theme context
// WHY: Allows any component to access theme colors
const ThemeContext = createContext(null)

// WHAT: Hook to access theme in any component
// WHY: Simplifies theme consumption with custom hook
export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

// WHAT: Default fallback colors
// WHY: Ensures app still renders if theme fetch fails
const defaultColors = {
  pageBackground: '#FFFFFF',
  textPrimary: '#000000',
  textSecondary: '#666666',
  cardBackground: '#FFFFFF',
  cardBorder: '#dddddd',
  buttonPrimary: '#667eea',
  buttonPrimaryText: '#FFFFFF',
  statusSuccess: '#4caf50',
  statusError: '#f44336',
  statusInfo: '#2196f3',
  statusWarning: '#ff9800'
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(null)
  const [colors, setColors] = useState(defaultColors)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // WHAT: Fetch active theme on component mount
  // WHY: Need to load theme before rendering
  useEffect(() => {
    fetchActiveTheme()
  }, [])

  const fetchActiveTheme = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/themes/active')
      
      if (res.ok) {
        const data = await res.json()
        setTheme(data.theme)
        setColors(data.theme.colors || defaultColors)
        setError(null)
      } else {
        console.error('Failed to fetch theme')
        setError('Failed to load theme')
        // Keep using default colors
      }
    } catch (err) {
      console.error('Theme fetch error:', err)
      setError(err.message)
      // Keep using default colors
    } finally {
      setLoading(false)
    }
  }

  // WHAT: Refresh theme (for admin to see changes immediately)
  // WHY: After editing theme, need to reload it
  const refreshTheme = async () => {
    await fetchActiveTheme()
  }

  // WHAT: Get color value by key
  // WHY: Provides type-safe color access with fallback
  const getColor = (colorKey) => {
    return colors[colorKey] || defaultColors[colorKey] || '#000000'
  }

  const value = {
    theme,
    colors,
    loading,
    error,
    refreshTheme,
    getColor
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

// WHAT: HOC to wrap components with theme provider
// WHY: Simplifies adding theme support to pages
export function withTheme(Component) {
  return function ThemedComponent(props) {
    return (
      <ThemeProvider>
        <Component {...props} />
      </ThemeProvider>
    )
  }
}
