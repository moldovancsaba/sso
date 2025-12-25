/**
 * Style Editor - Comprehensive Theme Color Management
 * 
 * WHAT: Admin interface for editing all theme colors with live preview
 * WHY: Allows customization of all 65+ colorable elements across admin pages
 * HOW: Organized color pickers by category with real-time updates
 */

import { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import styles from '../../styles/home.module.css'

// Server-side admin authentication check
export async function getServerSideProps(context) {
  const { getAdminUser } = await import('../../lib/auth.mjs')
  
  const admin = await getAdminUser(context.req)
  
  if (!admin) {
    return {
      redirect: {
        destination: '/admin?redirect=/admin/style-editor',
        permanent: false
      }
    }
  }
  
  // Only super-admins can edit themes
  if (admin.role !== 'super-admin') {
    return {
      redirect: {
        destination: '/admin',
        permanent: false
      }
    }
  }
  
  return {
    props: {
      admin: {
        id: admin.id,
        email: admin.email,
        role: admin.role
      }
    }
  }
}

export default function StyleEditor({ admin }) {
  const router = useRouter()
  const [themes, setThemes] = useState([])
  const [selectedTheme, setSelectedTheme] = useState(null)
  const [colors, setColors] = useState({})
  const [themeName, setThemeName] = useState('')
  const [themeDescription, setThemeDescription] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [exportData, setExportData] = useState(null)

  // WHAT: Load themes on mount
  useEffect(() => {
    loadThemes()
  }, [])

  // WHAT: Load colors when theme is selected
  useEffect(() => {
    if (selectedTheme) {
      setColors(selectedTheme.colors || {})
      setThemeName(selectedTheme.name)
      setThemeDescription(selectedTheme.description || '')
    }
  }, [selectedTheme])

  const loadThemes = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/themes', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setThemes(data.themes || [])
        
        // Auto-select active theme
        const activeTheme = data.themes.find(t => t.isActive)
        if (activeTheme && !selectedTheme) {
          setSelectedTheme(activeTheme)
        }
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to load themes' })
    } finally {
      setLoading(false)
    }
  }

  const handleColorChange = (colorKey, value) => {
    setColors(prev => ({ ...prev, [colorKey]: value }))
  }

  const handleSaveTheme = async () => {
    if (!selectedTheme) return

    setSaving(true)
    try {
      const res = await fetch(`/api/admin/themes/${selectedTheme.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ colors })
      })

      if (res.ok) {
        setMessage({ type: 'success', text: 'Theme saved successfully!' })
        await loadThemes()
        setTimeout(() => setMessage(null), 3000)
      } else {
        const data = await res.json()
        setMessage({ type: 'error', text: data.error || 'Failed to save theme' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to save theme' })
    } finally {
      setSaving(false)
    }
  }

  const handleActivateTheme = async () => {
    if (!selectedTheme) return

    try {
      const res = await fetch(`/api/admin/themes/${selectedTheme.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ activate: true })
      })

      if (res.ok) {
        setMessage({ type: 'success', text: 'Theme activated!' })
        await loadThemes()
        // Refresh page to apply new theme
        setTimeout(() => window.location.reload(), 1000)
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to activate theme' })
    }
  }

  const handleCreateTheme = async () => {
    if (!themeName.trim()) {
      setMessage({ type: 'error', text: 'Theme name is required' })
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/admin/themes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: themeName,
          description: themeDescription,
          colors: colors
        })
      })

      if (res.ok) {
        setMessage({ type: 'success', text: 'Theme created!' })
        setShowCreateForm(false)
        await loadThemes()
      } else {
        const data = await res.json()
        setMessage({ type: 'error', text: data.error || 'Failed to create theme' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to create theme' })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteTheme = async () => {
    if (!selectedTheme) return
    if (!confirm(`Delete theme "${selectedTheme.name}"? This cannot be undone.`)) return

    try {
      const res = await fetch(`/api/admin/themes/${selectedTheme.id}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (res.ok) {
        setMessage({ type: 'success', text: 'Theme deleted' })
        setSelectedTheme(null)
        await loadThemes()
      } else {
        const data = await res.json()
        setMessage({ type: 'error', text: data.error || 'Failed to delete theme' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to delete theme' })
    }
  }

  const handleExportTheme = () => {
    if (!selectedTheme) return
    const data = JSON.stringify(selectedTheme, null, 2)
    setExportData(data)
  }

  const handleImportTheme = async (file) => {
    try {
      const text = await file.text()
      const imported = JSON.parse(text)
      
      setColors(imported.colors || {})
      setThemeName(imported.name || 'Imported Theme')
      setThemeDescription(imported.description || '')
      setMessage({ type: 'success', text: 'Theme imported! Save to create.' })
      setShowCreateForm(true)
    } catch (err) {
      setMessage({ type: 'error', text: 'Invalid theme file' })
    }
  }

  const ColorPicker = ({ label, colorKey, description }) => (
    <div style={{ marginBottom: '16px' }}>
      <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <span style={{ fontSize: '13px', fontWeight: '600' }}>{label}</span>
        {description && (
          <span style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>{description}</span>
        )}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            type="color"
            value={colors[colorKey] || '#000000'}
            onChange={(e) => handleColorChange(colorKey, e.target.value)}
            style={{ width: '50px', height: '36px', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer' }}
          />
          <input
            type="text"
            value={colors[colorKey] || '#000000'}
            onChange={(e) => handleColorChange(colorKey, e.target.value)}
            style={{ flex: 1, padding: '8px 12px', fontSize: '13px', border: '1px solid #ddd', borderRadius: '4px', fontFamily: 'monospace' }}
          />
        </div>
      </label>
    </div>
  )

  return (
    <>
      <Head>
        <title>Style Editor - SSO Admin</title>
      </Head>

      <div className={styles.container} style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          
          {/* Header */}
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '8px' }}>
              🎨 Style Editor
            </h1>
            <p style={{ color: '#666', fontSize: '14px' }}>
              Customize all colors and styles for admin pages
            </p>
            <Link href="/admin" style={{ fontSize: '13px', color: '#667eea', textDecoration: 'none' }}>
              ← Back to Admin
            </Link>
          </div>

          {/* Message */}
          {message && (
            <div style={{
              background: message.type === 'error' ? '#fee' : '#e8f5e9',
              border: `1px solid ${message.type === 'error' ? '#fcc' : '#81c784'}`,
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '1.5rem',
              color: message.type === 'error' ? '#c33' : '#2e7d32',
              fontSize: '14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span>{message.text}</span>
              <button onClick={() => setMessage(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '18px' }}>×</button>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '2rem' }}>
            
            {/* Sidebar - Theme Selector */}
            <div>
              <div className={styles.apiCard}>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '18px', fontWeight: '600' }}>Themes</h3>
                
                <button
                  onClick={() => setShowCreateForm(!showCreateForm)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    marginBottom: '12px',
                    background: '#667eea',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}
                >
                  + Create New Theme
                </button>

                {loading ? (
                  <p style={{ textAlign: 'center', color: '#999' }}>Loading...</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {themes.map(theme => (
                      <button
                        key={theme.id}
                        onClick={() => setSelectedTheme(theme)}
                        style={{
                          padding: '12px',
                          background: selectedTheme?.id === theme.id ? '#f0f4ff' : 'white',
                          border: `2px solid ${selectedTheme?.id === theme.id ? '#667eea' : '#ddd'}`,
                          borderRadius: '8px',
                          cursor: 'pointer',
                          textAlign: 'left'
                        }}
                      >
                        <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '4px' }}>
                          {theme.name}
                          {theme.isActive && (
                            <span style={{ marginLeft: '8px', padding: '2px 6px', background: '#4caf50', color: 'white', borderRadius: '4px', fontSize: '10px' }}>
                              ACTIVE
                            </span>
                          )}
                        </div>
                        {theme.description && (
                          <div style={{ fontSize: '12px', color: '#666' }}>{theme.description}</div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Theme Actions */}
              {selectedTheme && !showCreateForm && (
                <div className={styles.apiCard} style={{ marginTop: '1rem' }}>
                  <h3 style={{ margin: '0 0 1rem 0', fontSize: '16px', fontWeight: '600' }}>Actions</h3>
                  
                  <button
                    onClick={handleSaveTheme}
                    disabled={saving}
                    style={{
                      width: '100%',
                      padding: '10px',
                      marginBottom: '8px',
                      background: saving ? '#999' : '#667eea',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: saving ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}
                  >
                    {saving ? 'Saving...' : '💾 Save Changes'}
                  </button>

                  {!selectedTheme.isActive && (
                    <button
                      onClick={handleActivateTheme}
                      style={{
                        width: '100%',
                        padding: '10px',
                        marginBottom: '8px',
                        background: '#4caf50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '600'
                      }}
                    >
                      ✓ Activate Theme
                    </button>
                  )}

                  <button
                    onClick={handleExportTheme}
                    style={{
                      width: '100%',
                      padding: '10px',
                      marginBottom: '8px',
                      background: 'white',
                      color: '#667eea',
                      border: '1px solid #667eea',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}
                  >
                    📤 Export Theme
                  </button>

                  <label style={{
                    width: '100%',
                    display: 'block',
                    padding: '10px',
                    marginBottom: '8px',
                    background: 'white',
                    color: '#667eea',
                    border: '1px solid #667eea',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    textAlign: 'center'
                  }}>
                    📥 Import Theme
                    <input
                      type="file"
                      accept=".json"
                      onChange={(e) => e.target.files[0] && handleImportTheme(e.target.files[0])}
                      style={{ display: 'none' }}
                    />
                  </label>

                  {selectedTheme.id !== 'default' && !selectedTheme.isActive && (
                    <button
                      onClick={handleDeleteTheme}
                      style={{
                        width: '100%',
                        padding: '10px',
                        background: '#f44336',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '600'
                      }}
                    >
                      🗑️ Delete Theme
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Main Content - Color Editor */}
            <div>
              {showCreateForm ? (
                <div className={styles.apiCard}>
                  <h2 style={{ margin: '0 0 1.5rem 0' }}>Create New Theme</h2>
                  
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '600' }}>
                      Theme Name *
                    </label>
                    <input
                      type="text"
                      value={themeName}
                      onChange={(e) => setThemeName(e.target.value)}
                      placeholder="e.g., Dark Mode, Blue Theme"
                      style={{ width: '100%', padding: '10px', fontSize: '14px', border: '1px solid #ddd', borderRadius: '6px', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '600' }}>
                      Description
                    </label>
                    <textarea
                      value={themeDescription}
                      onChange={(e) => setThemeDescription(e.target.value)}
                      placeholder="Optional description"
                      rows={3}
                      style={{ width: '100%', padding: '10px', fontSize: '14px', border: '1px solid #ddd', borderRadius: '6px', boxSizing: 'border-box', resize: 'vertical' }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={handleCreateTheme}
                      disabled={saving}
                      style={{
                        padding: '10px 20px',
                        background: saving ? '#999' : '#667eea',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: saving ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        fontWeight: '600'
                      }}
                    >
                      {saving ? 'Creating...' : 'Create Theme'}
                    </button>
                    <button
                      onClick={() => setShowCreateForm(false)}
                      style={{
                        padding: '10px 20px',
                        background: 'white',
                        color: '#667eea',
                        border: '1px solid #667eea',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '600'
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : selectedTheme ? (
                <div className={styles.apiCard}>
                  <h2 style={{ margin: '0 0 1.5rem 0' }}>Edit: {selectedTheme.name}</h2>
                  
                  {/* Color Pickers organized by category */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                    
                    {/* Page Structure */}
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', borderBottom: '2px solid #667eea', paddingBottom: '8px' }}>
                        Page Structure
                      </h3>
                      <ColorPicker label="Page Background" colorKey="pageBackground" />
                      <ColorPicker label="Container Background" colorKey="containerBackground" />
                    </div>

                    {/* Header Section */}
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', borderBottom: '2px solid #667eea', paddingBottom: '8px' }}>
                        Header Section
                      </h3>
                      <ColorPicker label="Page Title" colorKey="pageTitle" />
                      <ColorPicker label="Subtitle" colorKey="subtitle" />
                      <ColorPicker label="Back Link" colorKey="backLink" />
                    </div>

                    {/* Cards */}
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', borderBottom: '2px solid #667eea', paddingBottom: '8px' }}>
                        Cards
                      </h3>
                      <ColorPicker label="Card Background" colorKey="cardBackground" />
                      <ColorPicker label="Card Border" colorKey="cardBorder" />
                      <ColorPicker label="Card Shadow" colorKey="cardShadow" description="Use rgba() for transparency" />
                      <ColorPicker label="Card Hover Border" colorKey="cardHoverBorder" />
                    </div>

                    {/* Form Elements */}
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', borderBottom: '2px solid #667eea', paddingBottom: '8px' }}>
                        Form Elements
                      </h3>
                      <ColorPicker label="Label Text" colorKey="labelText" />
                      <ColorPicker label="Input Border" colorKey="inputBorder" />
                      <ColorPicker label="Input Background" colorKey="inputBackground" />
                      <ColorPicker label="Input Text" colorKey="inputText" />
                      <ColorPicker label="Input Focus" colorKey="inputFocus" />
                    </div>

                    {/* Text Colors */}
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', borderBottom: '2px solid #667eea', paddingBottom: '8px' }}>
                        Text Colors
                      </h3>
                      <ColorPicker label="Text Primary" colorKey="textPrimary" />
                      <ColorPicker label="Text Secondary" colorKey="textSecondary" />
                      <ColorPicker label="Text Tertiary" colorKey="textTertiary" />
                      <ColorPicker label="Text Inverse" colorKey="textInverse" description="For dark backgrounds" />
                    </div>

                    {/* Status Colors */}
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', borderBottom: '2px solid #667eea', paddingBottom: '8px' }}>
                        Status & Badges
                      </h3>
                      <ColorPicker label="Success" colorKey="statusSuccess" />
                      <ColorPicker label="Error" colorKey="statusError" />
                      <ColorPicker label="Info" colorKey="statusInfo" />
                      <ColorPicker label="Warning" colorKey="statusWarning" />
                      <ColorPicker label="Default" colorKey="statusDefault" />
                    </div>

                    {/* Success Messages */}
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', borderBottom: '2px solid #667eea', paddingBottom: '8px' }}>
                        Success Messages
                      </h3>
                      <ColorPicker label="Success Background" colorKey="successBackground" />
                      <ColorPicker label="Success Border" colorKey="successBorder" />
                      <ColorPicker label="Success Text" colorKey="successText" />
                    </div>

                    {/* Error Messages */}
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', borderBottom: '2px solid #667eea', paddingBottom: '8px' }}>
                        Error Messages
                      </h3>
                      <ColorPicker label="Error Background" colorKey="errorBackground" />
                      <ColorPicker label="Error Border" colorKey="errorBorder" />
                      <ColorPicker label="Error Text" colorKey="errorText" />
                    </div>

                    {/* Warning Messages */}
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', borderBottom: '2px solid #667eea', paddingBottom: '8px' }}>
                        Warning Messages
                      </h3>
                      <ColorPicker label="Warning Background" colorKey="warningBackground" />
                      <ColorPicker label="Warning Border" colorKey="warningBorder" />
                      <ColorPicker label="Warning Text" colorKey="warningText" />
                    </div>

                    {/* Info Messages */}
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', borderBottom: '2px solid #667eea', paddingBottom: '8px' }}>
                        Info Messages
                      </h3>
                      <ColorPicker label="Info Background" colorKey="infoBackground" />
                      <ColorPicker label="Info Border" colorKey="infoBorder" />
                      <ColorPicker label="Info Text" colorKey="infoText" />
                    </div>

                    {/* Primary Buttons */}
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', borderBottom: '2px solid #667eea', paddingBottom: '8px' }}>
                        Primary Buttons
                      </h3>
                      <ColorPicker label="Button Primary" colorKey="buttonPrimary" />
                      <ColorPicker label="Button Primary Hover" colorKey="buttonPrimaryHover" />
                      <ColorPicker label="Button Primary Text" colorKey="buttonPrimaryText" />
                    </div>

                    {/* Secondary Buttons */}
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', borderBottom: '2px solid #667eea', paddingBottom: '8px' }}>
                        Secondary Buttons
                      </h3>
                      <ColorPicker label="Button Secondary" colorKey="buttonSecondary" />
                      <ColorPicker label="Button Secondary Hover" colorKey="buttonSecondaryHover" />
                      <ColorPicker label="Button Secondary Text" colorKey="buttonSecondaryText" />
                    </div>

                    {/* Danger Buttons */}
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', borderBottom: '2px solid #667eea', paddingBottom: '8px' }}>
                        Danger Buttons
                      </h3>
                      <ColorPicker label="Button Danger" colorKey="buttonDanger" />
                      <ColorPicker label="Button Danger Hover" colorKey="buttonDangerHover" />
                      <ColorPicker label="Button Danger Text" colorKey="buttonDangerText" />
                    </div>

                    {/* Disabled Buttons */}
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', borderBottom: '2px solid #667eea', paddingBottom: '8px' }}>
                        Disabled Buttons
                      </h3>
                      <ColorPicker label="Button Disabled" colorKey="buttonDisabled" />
                      <ColorPicker label="Button Disabled Text" colorKey="buttonDisabledText" />
                    </div>

                    {/* Borders */}
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', borderBottom: '2px solid #667eea', paddingBottom: '8px' }}>
                        Borders & Dividers
                      </h3>
                      <ColorPicker label="Border Subtle" colorKey="borderSubtle" />
                      <ColorPicker label="Border Default" colorKey="borderDefault" />
                      <ColorPicker label="Border Strong" colorKey="borderStrong" />
                    </div>

                    {/* Login Methods */}
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', borderBottom: '2px solid #667eea', paddingBottom: '8px' }}>
                        Login Method Badges
                      </h3>
                      <ColorPicker label="Email Badge" colorKey="loginMethodEmail" />
                      <ColorPicker label="Facebook Badge" colorKey="loginMethodFacebook" />
                      <ColorPicker label="Google Badge" colorKey="loginMethodGoogle" />
                    </div>

                    {/* Modal */}
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', borderBottom: '2px solid #667eea', paddingBottom: '8px' }}>
                        Modal
                      </h3>
                      <ColorPicker label="Modal Overlay" colorKey="modalOverlay" description="Use rgba() for transparency" />
                      <ColorPicker label="Modal Background" colorKey="modalBackground" />
                      <ColorPicker label="Modal Shadow" colorKey="modalShadow" description="Use rgba() for transparency" />
                    </div>

                    {/* Other Elements */}
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', borderBottom: '2px solid #667eea', paddingBottom: '8px' }}>
                        Other Elements
                      </h3>
                      <ColorPicker label="App Name Highlight" colorKey="appNameText" />
                      <ColorPicker label="Expanded Border Top" colorKey="expandedBorderTop" />
                      <ColorPicker label="Detail Label" colorKey="detailLabel" />
                      <ColorPicker label="Detail Value" colorKey="detailValue" />
                      <ColorPicker label="Monospace Text" colorKey="monospaceText" />
                      <ColorPicker label="Loading Text" colorKey="loadingText" />
                      <ColorPicker label="Empty State Text" colorKey="emptyStateText" />
                    </div>

                    {/* Dark Theme (OAuth Clients) */}
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', borderBottom: '2px solid #667eea', paddingBottom: '8px' }}>
                        Dark Theme (OAuth Clients)
                      </h3>
                      <ColorPicker label="Dark Background" colorKey="darkBackground" />
                      <ColorPicker label="Dark Card Background" colorKey="darkCardBackground" />
                      <ColorPicker label="Dark Card Border" colorKey="darkCardBorder" />
                      <ColorPicker label="Dark Text" colorKey="darkText" />
                      <ColorPicker label="Dark Input Background" colorKey="darkInputBackground" />
                      <ColorPicker label="Dark Button Primary" colorKey="darkButtonPrimary" />
                      <ColorPicker label="Dark Button Secondary" colorKey="darkButtonSecondary" />
                      <ColorPicker label="Dark Button Delete" colorKey="darkButtonDelete" />
                      <ColorPicker label="Dark Status Active" colorKey="darkStatusActive" />
                      <ColorPicker label="Dark Status Suspended" colorKey="darkStatusSuspended" />
                      <ColorPicker label="Dark Warning Background" colorKey="darkWarningBackground" />
                      <ColorPicker label="Dark Warning Border" colorKey="darkWarningBorder" />
                      <ColorPicker label="Dark Warning Text" colorKey="darkWarningText" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className={styles.apiCard}>
                  <p style={{ textAlign: 'center', padding: '3rem', color: '#999' }}>
                    Select a theme from the sidebar to start editing
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Export Data Modal */}
          {exportData && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000
            }}>
              <div style={{
                background: 'white',
                borderRadius: '12px',
                padding: '24px',
                maxWidth: '600px',
                width: '100%',
                maxHeight: '80vh',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <h3 style={{ margin: '0 0 16px 0' }}>Export Theme</h3>
                <textarea
                  readOnly
                  value={exportData}
                  style={{
                    flex: 1,
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    resize: 'none'
                  }}
                />
                <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(exportData)
                      setMessage({ type: 'success', text: 'Copied to clipboard!' })
                      setExportData(null)
                    }}
                    style={{
                      padding: '10px 20px',
                      background: '#667eea',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}
                  >
                    Copy to Clipboard
                  </button>
                  <button
                    onClick={() => setExportData(null)}
                    style={{
                      padding: '10px 20px',
                      background: 'white',
                      color: '#667eea',
                      border: '1px solid #667eea',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
