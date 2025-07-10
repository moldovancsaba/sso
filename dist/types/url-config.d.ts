import { ObjectId } from 'mongodb';
export interface URLConfigDocument {
    _id: ObjectId;
    name: string;
    baseUrl: string;
    tenantId: string;
    isDefault: boolean;
    environment: string;
    callbackUrls: string[];
    createdAt: string;
    updatedAt: string;
}
export interface URLConfigCreateInput {
    name: string;
    baseUrl: string;
    tenantId: string;
    isDefault?: boolean;
    environment: string;
    callbackUrls: string[];
}
export interface URLConfigUpdateInput {
    name?: string;
    baseUrl?: string;
    isDefault?: boolean;
    environment?: string;
    callbackUrls?: string[];
}
//# sourceMappingURL=url-config.d.ts.map