#!/usr/bin/env node
/**
 * scripts/merge-duplicate-accounts.mjs - Merge duplicate public user accounts
 * 
 * WHAT: One-time migration script to merge duplicate accounts with same email
 * WHY: Before account linking was implemented, users could create multiple accounts
 *      with the same email (one via email+password, one via Facebook, one via Google)
 * HOW: Finds duplicates by email, merges social providers, keeps oldest account
 * 
 * Usage:
 *   DRY_RUN=true node scripts/merge-duplicate-accounts.mjs  # Preview only
 *   node scripts/merge-duplicate-accounts.mjs               # Actually merge
 */

import { getDb } from '../lib/db.mjs'
import logger from '../lib/logger.mjs'

// WHAT: Check if running in dry-run mode (preview only, no changes)
// WHY: Allow admin to review changes before applying them
const DRY_RUN = process.env.DRY_RUN === 'true'

/**
 * WHAT: Find all accounts that have duplicate emails
 * WHY: Need to identify which accounts to merge
 * @returns {Array<{email: string, count: number, accounts: Array}>}
 */
async function findDuplicateAccounts(db) {
  logger.info('Searching for duplicate accounts...')
  
  // WHAT: Aggregate to find emails with multiple accounts
  const duplicates = await db.collection('publicUsers').aggregate([
    {
      $group: {
        _id: '$email',
        count: { $sum: 1 },
        accounts: { $push: '$$ROOT' }
      }
    },
    {
      $match: {
        count: { $gt: 1 }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]).toArray()
  
  return duplicates.map(dup => ({
    email: dup._id,
    count: dup.count,
    accounts: dup.accounts
  }))
}

/**
 * WHAT: Merge duplicate accounts for a single email
 * WHY: Consolidate all login methods into one account
 * @param {Object} db - MongoDB database instance
 * @param {string} email - Email address to merge accounts for
 * @param {Array} accounts - List of accounts with this email
 * @returns {Object} - Merge result summary
 */
async function mergeAccountsForEmail(db, email, accounts) {
  logger.info(`Merging ${accounts.length} accounts for ${email}`)
  
  // WHAT: Sort accounts by createdAt to keep the oldest
  // WHY: Oldest account is likely the "primary" account
  accounts.sort((a, b) => {
    const aDate = a.createdAt ? new Date(a.createdAt) : new Date(0)
    const bDate = b.createdAt ? new Date(b.createdAt) : new Date(0)
    return aDate - bDate
  })
  
  const primaryAccount = accounts[0]
  const duplicateAccounts = accounts.slice(1)
  
  logger.info(`Primary account: ${primaryAccount.id} (created ${primaryAccount.createdAt})`)
  
  // WHAT: Collect all social providers from all accounts
  // WHY: Need to preserve all login methods
  const mergedSocialProviders = { ...(primaryAccount.socialProviders || {}) }
  const duplicateIds = []
  
  for (const duplicate of duplicateAccounts) {
    logger.info(`  Merging duplicate: ${duplicate.id} (created ${duplicate.createdAt})`)
    duplicateIds.push(duplicate.id)
    
    // WHAT: Merge social providers
    if (duplicate.socialProviders) {
      for (const [provider, data] of Object.entries(duplicate.socialProviders)) {
        if (!mergedSocialProviders[provider]) {
          mergedSocialProviders[provider] = data
          logger.info(`    + Adding ${provider} provider`)
        }
      }
    }
    
    // WHAT: Copy passwordHash if primary doesn't have one but duplicate does
    if (!primaryAccount.passwordHash && duplicate.passwordHash) {
      logger.info(`    + Copying passwordHash from duplicate`)
      if (!DRY_RUN) {
        await db.collection('publicUsers').updateOne(
          { _id: primaryAccount._id },
          { $set: { passwordHash: duplicate.passwordHash } }
        )
      }
    }
  }
  
  // WHAT: Update primary account with merged social providers
  if (!DRY_RUN) {
    await db.collection('publicUsers').updateOne(
      { _id: primaryAccount._id },
      { 
        $set: { 
          socialProviders: mergedSocialProviders,
          updatedAt: new Date().toISOString()
        }
      }
    )
  }
  
  // WHAT: Transfer sessions from duplicates to primary
  for (const duplicateId of duplicateIds) {
    const sessionCount = await db.collection('publicSessions').countDocuments({ userId: duplicateId })
    if (sessionCount > 0) {
      logger.info(`  Transferring ${sessionCount} sessions from ${duplicateId}`)
      if (!DRY_RUN) {
        await db.collection('publicSessions').updateMany(
          { userId: duplicateId },
          { $set: { userId: primaryAccount.id } }
        )
      }
    }
  }
  
  // WHAT: Transfer OAuth authorizations from duplicates to primary
  for (const duplicateId of duplicateIds) {
    const authCount = await db.collection('authorizationCodes').countDocuments({ userId: duplicateId })
    if (authCount > 0) {
      logger.info(`  Transferring ${authCount} authorization codes from ${duplicateId}`)
      if (!DRY_RUN) {
        await db.collection('authorizationCodes').updateMany(
          { userId: duplicateId },
          { $set: { userId: primaryAccount.id } }
        )
      }
    }
    
    const tokenCount = await db.collection('accessTokens').countDocuments({ userId: duplicateId })
    if (tokenCount > 0) {
      logger.info(`  Transferring ${tokenCount} access tokens from ${duplicateId}`)
      if (!DRY_RUN) {
        await db.collection('accessTokens').updateMany(
          { userId: duplicateId },
          { $set: { userId: primaryAccount.id } }
        )
      }
    }
    
    const refreshCount = await db.collection('refreshTokens').countDocuments({ userId: duplicateId })
    if (refreshCount > 0) {
      logger.info(`  Transferring ${refreshCount} refresh tokens from ${duplicateId}`)
      if (!DRY_RUN) {
        await db.collection('refreshTokens').updateMany(
          { userId: duplicateId },
          { $set: { userId: primaryAccount.id } }
        )
      }
    }
  }
  
  // WHAT: Delete duplicate accounts
  if (!DRY_RUN) {
    for (const duplicate of duplicateAccounts) {
      logger.info(`  Deleting duplicate account: ${duplicate.id}`)
      await db.collection('publicUsers').deleteOne({ _id: duplicate._id })
    }
  }
  
  return {
    email,
    primaryAccountId: primaryAccount.id,
    mergedCount: duplicateAccounts.length,
    mergedAccountIds: duplicateIds,
    loginMethods: Object.keys(mergedSocialProviders).concat(primaryAccount.passwordHash ? ['password'] : [])
  }
}

/**
 * WHAT: Main migration function
 * WHY: Entry point for the script
 */
async function main() {
  try {
    logger.info('=== Merge Duplicate Accounts Migration ===')
    logger.info(`Mode: ${DRY_RUN ? 'DRY RUN (preview only)' : 'LIVE (will make changes)'}`)
    
    // WHAT: Connect to database
    const db = await getDb()
    
    // WHAT: Find all duplicate accounts
    const duplicates = await findDuplicateAccounts(db)
    
    if (duplicates.length === 0) {
      logger.info('✅ No duplicate accounts found!')
      process.exit(0)
    }
    
    logger.info(`Found ${duplicates.length} email addresses with duplicate accounts`)
    
    // WHAT: Show summary
    let totalAccounts = 0
    for (const dup of duplicates) {
      totalAccounts += dup.count
      logger.info(`  ${dup.email}: ${dup.count} accounts`)
    }
    
    logger.info(`Total accounts to merge: ${totalAccounts}`)
    logger.info(`Will keep: ${duplicates.length} primary accounts`)
    logger.info(`Will delete: ${totalAccounts - duplicates.length} duplicate accounts`)
    
    if (DRY_RUN) {
      logger.info('')
      logger.info('This is a DRY RUN - no changes will be made')
      logger.info('Run without DRY_RUN=true to apply changes')
      logger.info('')
    }
    
    // WHAT: Process each email's duplicates
    const results = []
    for (const dup of duplicates) {
      const result = await mergeAccountsForEmail(db, dup.email, dup.accounts)
      results.push(result)
    }
    
    // WHAT: Print summary
    logger.info('')
    logger.info('=== Migration Summary ===')
    for (const result of results) {
      logger.info(`${result.email}:`)
      logger.info(`  Primary account: ${result.primaryAccountId}`)
      logger.info(`  Merged ${result.mergedCount} duplicate(s)`)
      logger.info(`  Login methods: ${result.loginMethods.join(', ')}`)
    }
    
    logger.info('')
    if (DRY_RUN) {
      logger.info('✅ Dry run complete - no changes made')
      logger.info('Run without DRY_RUN=true to apply changes')
    } else {
      logger.info('✅ Migration complete!')
    }
    
    process.exit(0)
  } catch (error) {
    logger.error('Migration failed', {
      error: error.message,
      stack: error.stack
    })
    process.exit(1)
  }
}

// Run the script
main()
