export interface Identity {
    gametag: string;
    emoji: string;
    color: string;
    createdAt: string;
    updatedAt: string;
}
export interface IdentityDocument extends Identity {
    _id: string;
    tenantId: string;
}
export declare const EMOJIS: string[];
export declare const BASE_COLORS: string[];
//# sourceMappingURL=identity.d.ts.map