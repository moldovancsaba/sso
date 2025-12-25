# Style Editor Guide

**Document**: STYLE_EDITOR_GUIDE.md  
**Version**: 5.28.0  
**CreatedAt (UTC)**: 2025-12-22T16:26:56.000Z  
**LastUpdated (UTC)**: 2025-12-22T16:26:56.000Z  
**Maintainer**: moldovancsaba  
**Status**: Authoritative Source of Truth

---

## Overview

The Style Editor is a comprehensive theme management system that allows super-admins to customize all colors and styling across SSO admin pages. With 65+ customizable color elements organized into logical categories, the system provides complete visual control over the admin interface.

## Key Features

- **65+ Customizable Elements**: Complete control over all colorable elements across admin pages
- **Multi-Theme Support**: Create, manage, and switch between multiple themes
- **Live Preview**: See changes immediately as colors are adjusted
- **Export/Import**: Share themes or backup configurations as JSON files
- **Theme Activation**: Single-click theme switching with automatic page refresh
- **Category Organization**: Colors organized by function (Buttons, Cards, Messages, etc.)
- **Validation**: Built-in color validation for hex, rgb(), and rgba() formats
- **Default Fallback**: System always has a default theme if custom themes fail

## Access & Permissions

- **URL**: `https://sso.doneisbetter.com/admin/style-editor`
- **Required Role**: `super-admin` only
- **Authentication**: Admin session required
- **Navigation**: Accessible from Admin Home page (🎨 Style Editor button)

## Architecture

### Database Schema

**Collection**: `styleThemes`

```javascript
{
  id: string,              // UUID identifier
  _id: ObjectId,           // MongoDB internal ID
  name: string,            // Theme name (e.g., "Default Theme", "Dark Mode")
  description: string,     // Optional theme description
  isActive: boolean,       // Only one theme can be active at a time
  colors: {
    // 65+ color properties (see "Colorable Elements" section)
  },
  createdAt: string,       // ISO 8601 UTC with milliseconds
  updatedAt: string        // ISO 8601 UTC with milliseconds
}
```

### API Endpoints

#### Theme Management
- `GET /api/admin/themes` - List all themes
- `POST /api/admin/themes` - Create new theme
- `GET /api/admin/themes/[themeId]` - Get theme by ID
- `PATCH /api/admin/themes/[themeId]` - Update theme colors or activate
- `DELETE /api/admin/themes/[themeId]` - Delete theme (if not active or default)

#### Public Access
- `GET /api/themes/active` - Get currently active theme (no auth required)

### Components

#### ThemeProvider
**Location**: `components/ThemeProvider.js`

React context provider that supplies theme colors to all components:

```javascript
import { useTheme } from '../components/ThemeProvider'

function MyComponent() {
  const { colors, getColor, refreshTheme } = useTheme()
  
  return (
    <div style={{ background: colors.cardBackground }}>
      {/* Your content */}
    </div>
  )
}
```

#### Style Editor UI
**Location**: `pages/admin/style-editor.js`

Full-featured admin interface with:
- Theme selector sidebar
- Color picker grid (organized by category)
- Create/edit/delete theme actions
- Export/import functionality
- Real-time color updates

### Library Functions

**Location**: `lib/styleThemes.mjs`

Core functions:
- `getAllThemes(db)` - Retrieve all themes
- `getActiveTheme(db)` - Get currently active theme
- `getThemeById(db, themeId)` - Get specific theme
- `createTheme(db, themeData)` - Create new theme
- `updateTheme(db, themeId, updates)` - Update theme properties
- `setActiveTheme(db, themeId)` - Activate a theme
- `deleteTheme(db, themeId)` - Delete a theme
- `validateColor(color)` - Validate color format
- `validateTheme(theme)` - Validate entire theme object

---

## Colorable Elements

All 65+ colorable elements organized by category:

### Page Structure (2)
- `pageBackground` - Main page background color
- `containerBackground` - Container background color

### Header Section (3)
- `pageTitle` - Page title (H1) color
- `subtitle` - Subtitle text color
- `backLink` - Back link color

### Cards (4)
- `cardBackground` - Card background color
- `cardBorder` - Card border color
- `cardShadow` - Card drop shadow (supports rgba)
- `cardHoverBorder` - Card border on hover

### Form Elements (5)
- `labelText` - Form label text color
- `inputBorder` - Input border color
- `inputBackground` - Input background color
- `inputText` - Input text color
- `inputFocus` - Input border color when focused

### Text Colors (4)
- `textPrimary` - Primary text color
- `textSecondary` - Secondary text color
- `textTertiary` - Tertiary/muted text color
- `textInverse` - Inverse text (for dark backgrounds)

### Status & Badges (5)
- `statusSuccess` - Success status color (green)
- `statusError` - Error status color (red)
- `statusInfo` - Info status color (blue)
- `statusWarning` - Warning status color (orange)
- `statusDefault` - Default status color (gray)

### Success Messages (3)
- `successBackground` - Success message background
- `successBorder` - Success message border
- `successText` - Success message text

### Error Messages (3)
- `errorBackground` - Error message background
- `errorBorder` - Error message border
- `errorText` - Error message text

### Warning Messages (3)
- `warningBackground` - Warning message background
- `warningBorder` - Warning message border
- `warningText` - Warning message text

### Info Messages (3)
- `infoBackground` - Info message background
- `infoBorder` - Info message border
- `infoText` - Info message text

### Primary Buttons (3)
- `buttonPrimary` - Primary button background
- `buttonPrimaryHover` - Primary button hover state
- `buttonPrimaryText` - Primary button text color

### Secondary Buttons (3)
- `buttonSecondary` - Secondary button background
- `buttonSecondaryHover` - Secondary button hover state
- `buttonSecondaryText` - Secondary button text color

### Danger Buttons (3)
- `buttonDanger` - Danger button background
- `buttonDangerHover` - Danger button hover state
- `buttonDangerText` - Danger button text color

### Disabled Buttons (2)
- `buttonDisabled` - Disabled button background
- `buttonDisabledText` - Disabled button text color

### Borders & Dividers (3)
- `borderSubtle` - Subtle border color
- `borderDefault` - Default border color
- `borderStrong` - Strong/emphasized border color

### Login Method Badges (3)
- `loginMethodEmail` - Email+Password badge color
- `loginMethodFacebook` - Facebook badge color (#1877f2)
- `loginMethodGoogle` - Google badge color (#ea4335)

### Modal (3)
- `modalOverlay` - Modal backdrop overlay (supports rgba)
- `modalBackground` - Modal content background
- `modalShadow` - Modal shadow (supports rgba)

### Other Elements (7)
- `appNameText` - App name highlight color
- `expandedBorderTop` - Expanded section border
- `detailLabel` - Detail label text color
- `detailValue` - Detail value text color
- `monospaceText` - Monospace text color
- `loadingText` - Loading state text color
- `emptyStateText` - Empty state text color

### Dark Theme Elements (13)
*(Used in OAuth Clients page)*
- `darkBackground` - Dark mode main background
- `darkCardBackground` - Dark mode card background
- `darkCardBorder` - Dark mode card border
- `darkText` - Dark mode text color
- `darkInputBackground` - Dark mode input background
- `darkButtonPrimary` - Dark mode primary button
- `darkButtonSecondary` - Dark mode secondary button
- `darkButtonDelete` - Dark mode delete button
- `darkStatusActive` - Dark mode active status
- `darkStatusSuspended` - Dark mode suspended status
- `darkWarningBackground` - Dark mode warning background
- `darkWarningBorder` - Dark mode warning border
- `darkWarningText` - Dark mode warning text

---

## Usage Guide

### Creating a New Theme

1. Navigate to `/admin/style-editor`
2. Click **"+ Create New Theme"** button
3. Enter theme name and optional description
4. Click **"Create Theme"**
5. New theme is created with default colors
6. Customize colors as desired
7. Click **"💾 Save Changes"** to persist

### Editing an Existing Theme

1. Select theme from sidebar
2. Modify colors using:
   - Color picker (visual selector)
   - Text input (hex, rgb, or rgba)
3. Changes are reflected in real-time in the UI
4. Click **"💾 Save Changes"** when done

### Activating a Theme

1. Select desired theme from sidebar
2. Click **"✓ Activate Theme"**
3. Page will refresh automatically
4. New theme applies across all admin pages

### Exporting a Theme

1. Select theme to export
2. Click **"📤 Export Theme"**
3. Modal appears with JSON data
4. Click **"Copy to Clipboard"**
5. Save JSON to file for backup/sharing

### Importing a Theme

1. Click **"📥 Import Theme"**
2. Select JSON file
3. Theme data loads into editor
4. Review and modify if needed
5. Click **"Create Theme"** to save

### Deleting a Theme

1. Select theme to delete
2. Click **"🗑️ Delete Theme"**
3. Confirm deletion
4. Theme is permanently removed

**Restrictions:**
- Cannot delete the default theme
- Cannot delete currently active theme (activate another first)

---

## Color Format Guidelines

### Supported Formats

**Hex Colors**
- Short form: `#FFF`
- Long form: `#FFFFFF`
- Case insensitive: `#fff` or `#FFF`

**RGB Colors**
- Format: `rgb(255, 255, 255)`
- Values: 0-255

**RGBA Colors** *(for transparency)*
- Format: `rgba(0, 0, 0, 0.7)`
- RGB values: 0-255
- Alpha: 0-1 (decimal)

### Recommended Usage

- **Solid Colors**: Use hex format (`#667eea`)
- **Transparent Overlays**: Use rgba format (`rgba(0, 0, 0, 0.7)`)
- **Shadows**: Use rgba format for smooth transitions

### Examples

```javascript
// Good examples
pageBackground: '#FFFFFF'
buttonPrimary: '#667eea'
modalOverlay: 'rgba(0, 0, 0, 0.7)'
cardShadow: 'rgba(0, 0, 0, 0.1)'

// Bad examples (will fail validation)
pageBackground: 'white'      // Named colors not supported
buttonPrimary: '#66e'        // Invalid hex length
modalOverlay: 'rgba(0,0,0)'  // Missing alpha value
```

---

## Best Practices

### Theme Naming
- Use descriptive names: "Dark Mode", "High Contrast", "Company Branding"
- Include version or date if iterating: "Dark Mode v2", "Brand 2025"

### Color Selection
- **Maintain Contrast**: Ensure text is readable on backgrounds (WCAG AA minimum)
- **Consistent Palette**: Use harmonious colors that work well together
- **Test Thoroughly**: View all admin pages with theme before activating
- **Consider Accessibility**: Avoid color combinations that are difficult for colorblind users

### Theme Management
- **Keep Default Theme**: Never modify or delete the default theme
- **Test Before Activating**: Thoroughly review theme before making it active
- **Export Regularly**: Backup themes as JSON files
- **Document Changes**: Use description field to note what changed

### Performance
- Theme data is cached on frontend
- Page refresh required after activation
- No performance impact on non-admin pages

---

## Troubleshooting

### Theme Not Loading
**Problem**: Colors not applying after activation
**Solution**: 
- Clear browser cache
- Check browser console for errors
- Verify theme is marked as `isActive` in database

### Invalid Color Error
**Problem**: "Invalid color value" error when saving
**Solution**:
- Ensure color format is hex, rgb(), or rgba()
- Check for typos in color values
- Verify rgba() has alpha value (0-1)

### Cannot Delete Theme
**Problem**: Delete button disabled or error when deleting
**Solution**:
- Cannot delete active theme - activate another theme first
- Cannot delete default theme - this is intentional

### Export Not Working
**Problem**: Export modal doesn't show JSON
**Solution**:
- Check browser console for JavaScript errors
- Try refreshing page and exporting again

### Import Failed
**Problem**: "Invalid theme file" error
**Solution**:
- Verify JSON file is valid (use JSON validator)
- Ensure file contains required fields: name, colors
- Check that colors object has valid color values

---

## Integration with Existing Pages

### Using Theme in New Components

```javascript
import { useTheme } from '../components/ThemeProvider'

export default function MyComponent() {
  const { colors, getColor } = useTheme()
  
  return (
    <div style={{
      background: colors.cardBackground,
      border: `1px solid ${colors.cardBorder}`,
      color: colors.textPrimary
    }}>
      <h2 style={{ color: colors.pageTitle }}>Title</h2>
      <p style={{ color: colors.textSecondary }}>Description</p>
      <button style={{
        background: colors.buttonPrimary,
        color: colors.buttonPrimaryText
      }}>
        Click Me
      </button>
    </div>
  )
}
```

### Wrapping Pages with ThemeProvider

```javascript
// Option 1: Individual page
import { ThemeProvider } from '../components/ThemeProvider'

export default function MyPage() {
  return (
    <ThemeProvider>
      <div>
        {/* Your page content */}
      </div>
    </ThemeProvider>
  )
}

// Option 2: Using HOC
import { withTheme } from '../components/ThemeProvider'

function MyPage() {
  return <div>{/* Your page content */}</div>
}

export default withTheme(MyPage)
```

---

## Security Considerations

- **Admin Only**: Theme editing restricted to super-admin role
- **Validation**: All color values validated before saving
- **SQL Injection**: MongoDB parameterized queries prevent injection
- **XSS Prevention**: Color values validated against pattern whitelist
- **CSRF**: Requests use credentials-based authentication

---

## Maintenance

### Adding New Color Elements

1. Update `lib/styleThemes.mjs` default theme with new color
2. Add color picker in `pages/admin/style-editor.js`
3. Update this documentation with new element
4. Create migration script to add color to existing themes (optional)

### Database Maintenance

```javascript
// Find all themes
db.styleThemes.find({})

// Reset theme to defaults
db.styleThemes.updateOne(
  { id: 'default' },
  { $set: { colors: defaultTheme.colors } }
)

// Set active theme
db.styleThemes.updateMany({}, { $set: { isActive: false } })
db.styleThemes.updateOne({ id: 'theme-id' }, { $set: { isActive: true } })
```

---

## Future Enhancements

Potential features for future versions:
- [ ] Real-time preview without page refresh
- [ ] Color palette suggestions
- [ ] Accessibility contrast checker
- [ ] Theme marketplace/sharing
- [ ] Per-page theme overrides
- [ ] Dark mode toggle switch
- [ ] Gradient support
- [ ] Font customization
- [ ] Spacing/sizing customization
- [ ] Theme versioning/history

---

## Support & Resources

- **Technical Questions**: Contact moldovancsaba
- **Bug Reports**: Create issue in repository
- **Feature Requests**: Submit via admin feedback

---

**Last Updated**: 2025-12-22T16:26:56.000Z by moldovancsaba
