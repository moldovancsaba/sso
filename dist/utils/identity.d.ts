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
export declare function generateIdentityProfile(identifier: string): {
    gametag: string;
    emoji: string;
    color: string;
    createdAt: string;
    updatedAt: string;
};
//# sourceMappingURL=identity.d.ts.map