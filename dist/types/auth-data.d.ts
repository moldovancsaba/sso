export interface AuthData {
    userId: string;
    provider: string;
    providerId: string;
    accessToken?: string;
    refreshToken?: string;
    tokenType?: string;
    expiresAt?: string;
    scope?: string;
    profile?: {
        [key: string]: any;
    };
    metadata?: {
        [key: string]: any;
    };
    createdAt: string;
    updatedAt: string;
}
export interface AuthDataCreateInput {
    provider: string;
    providerId: string;
    accessToken?: string;
    refreshToken?: string;
}
export interface AuthTokensUpdateInput {
    accessToken?: string;
    refreshToken?: string;
}
//# sourceMappingURL=auth-data.d.ts.map