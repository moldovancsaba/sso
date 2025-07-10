import { User } from '../types/user';
import { Database } from '../db/database';

/**
 * Handles the login response by enriching the user data with their identity information
 * if available. This ensures that UI components have immediate access to display-related
 * identity data like gametag, emoji, and color preferences.
 * 
 * @param user The authenticated user object
 * @returns Enhanced user object with identity data if available
 */
export async function handleLoginResponse(user: User) {
  const database = await Database.getInstance();
  
  // Fetch identity data if user has an associated identity
  const identity = user.identityId ? 
    await database.getIdentity(user.identityId) : 
    null;
    
  return {
    user: {
      ...user,
      identity: identity ? {
        gametag: identity.gametag,
        emoji: identity.emoji,
        color: identity.color
      } : null
    },
    // Preserve existing response data structure
    timestamp: new Date().toISOString(),
    success: true
  };
}
