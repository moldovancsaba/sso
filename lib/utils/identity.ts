import { EMOJIS, BASE_COLORS } from '../types/identity';

/**
 * Generates a random identity profile with randomly assigned gametag, emoji and color
 * This utility provides consistent player profiles with:
 * - Random gametag in format player_[random string]
 * - Random emoji from predefined set
 * - Random color from base color palette
 * - ISO 8601 timestamps for creation/update tracking
 * 
 * @param identifier User's unique identifier string
 * @returns Generated identity profile object
 */
export function generateIdentityProfile(identifier: string) {
  return {
    gametag: `player_${Math.random().toString(36).substring(2, 8)}`,
    emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
    color: BASE_COLORS[Math.floor(Math.random() * BASE_COLORS.length)],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}
