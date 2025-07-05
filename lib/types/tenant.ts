import { ObjectId } from 'mongodb';

export interface TenantConfig {
  id: string;
  name: string;
  domain: string;
  createdAt: string;
  updatedAt: string;
  settings: {
    allowedRedirectDomains: string[];
    tokenExpiryMinutes: number;
    ipWhitelist: string[];
    rateLimit: {
      requestsPerMinute: number;
      burstSize: number;
    };
  };
  apiKeys: {
    key: string;
    name: string;
    createdAt: string;
    lastUsed: string;
  }[];
}

export interface TenantAuthLog {
  tenantId: string;
  identifier: string;
  action: 'created' | 'used' | 'revoked';
  timestamp: string;
  source: string;
  ip: string;
  userAgent: string;
}

export interface TenantDocument {
  _id: ObjectId;
  name: string;
  domain: string;
  createdAt: string;
  updatedAt: string;
  settings: {
    allowedRedirectDomains: string[];
    tokenExpiryMinutes: number;
    ipWhitelist: string[];
    rateLimit: {
      requestsPerMinute: number;
      burstSize: number;
    };
  };
  apiKeys: {
    key: string;
    name: string;
    createdAt: string;
    lastUsed: string;
  }[];
}
