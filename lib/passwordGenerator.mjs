/**
 * lib/passwordGenerator.mjs - Secure password generation
 * WHAT: Generates secure random passwords for different user types
 * WHY: Forgot password feature needs to auto-generate secure passwords
 */

import crypto from 'crypto'

/**
 * generateAdminPassword
 * WHAT: Generates 32-character hexadecimal token for admin users
 * WHY: Admins use 32-hex tokens as passwords (system convention)
 * 
 * @returns {string} - 32-character hex string
 */
export function generateAdminPassword() {
  return crypto.randomBytes(16).toString('hex')
}

/**
 * generateStrongPassword
 * WHAT: Generates strong random password for public/org users
 * WHY: Secure, memorable-ish passwords with mixed characters
 * 
 * @param {number} length - Password length (default: 16)
 * @returns {string} - Strong random password
 */
export function generateStrongPassword(length = 16) {
  // Character sets for password generation
  const lowercase = 'abcdefghijklmnopqrstuvwxyz'
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const numbers = '0123456789'
  const symbols = '!@#$%^&*'
  
  const allChars = lowercase + uppercase + numbers + symbols
  
  // Ensure at least one character from each set
  let password = ''
  password += lowercase[crypto.randomInt(lowercase.length)]
  password += uppercase[crypto.randomInt(uppercase.length)]
  password += numbers[crypto.randomInt(numbers.length)]
  password += symbols[crypto.randomInt(symbols.length)]
  
  // Fill the rest with random characters
  for (let i = password.length; i < length; i++) {
    password += allChars[crypto.randomInt(allChars.length)]
  }
  
  // Shuffle the password to randomize character positions
  return password.split('').sort(() => Math.random() - 0.5).join('')
}

/**
 * generatePasswordForUserType
 * WHAT: Generates appropriate password based on user type
 * WHY: Different user types require different password formats
 * 
 * @param {string} userType - 'admin' | 'public' | 'org'
 * @returns {string} - Generated password
 */
export function generatePasswordForUserType(userType) {
  switch (userType) {
    case 'admin':
      return generateAdminPassword()
    case 'public':
    case 'org':
      return generateStrongPassword(16)
    default:
      return generateStrongPassword(16)
  }
}
