import { User } from '../types/user';
/**
 * Handles the login response by enriching the user data with their identity information
 * if available. This ensures that UI components have immediate access to display-related
 * identity data like gametag, emoji, and color preferences.
 *
 * @param user The authenticated user object
 * @returns Enhanced user object with identity data if available
 */
export declare function handleLoginResponse(user: User): Promise<{
    user: {
        identity: {
            gametag: string;
            emoji: string;
            color: string;
        } | null;
        id: string;
        identifier: string;
        email?: string;
        emailVerified?: boolean;
        identityId?: string;
        profile?: {
            name?: string;
            givenName?: string;
            familyName?: string;
            middleName?: string;
            nickname?: string;
            preferredUsername?: string;
            picture?: string;
            website?: string;
            gender?: string;
            birthdate?: string;
            zoneinfo?: string;
            locale?: string;
            phoneNumber?: string;
            phoneNumberVerified?: boolean;
            address?: {
                formatted?: string;
                streetAddress?: string;
                locality?: string;
                region?: string;
                postalCode?: string;
                country?: string;
            };
        };
        metadata?: {
            [key: string]: any;
        };
        createdAt: string;
        lastLoginAt: string;
        updatedAt: string;
    };
    timestamp: string;
    success: boolean;
}>;
//# sourceMappingURL=loginResponse.d.ts.map