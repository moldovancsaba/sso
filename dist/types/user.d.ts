/**
 * Enhanced user interface including OIDC standard claims
 */
export interface User {
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
}
//# sourceMappingURL=user.d.ts.map