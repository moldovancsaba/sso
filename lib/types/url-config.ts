import { ObjectId } from 'mongodb';

export interface URLConfigDocument {
  _id: ObjectId;
  name: string;           // e.g., "Production", "Development"
  baseUrl: string;        // e.g., "https://sso.doneisbetter.com"
  tenantId: string;      // Associated tenant ID
  isDefault: boolean;     // Whether this is the default configuration
  environment: string;   // "development" | "production" | "test"
  callbackUrls: string[]; // List of allowed callback URLs
  createdAt: string;     // ISO 8601 timestamp
  updatedAt: string;     // ISO 8601 timestamp
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
