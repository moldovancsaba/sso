export interface JWTPayload {
  sub: string;
  iat?: number;
  exp?: number;
  [key: string]: any;
}

export interface JWTSignOptions {
  expiresIn?: string | number;
  algorithm?: 'HS256' | 'HS384' | 'HS512' | 'RS256' | 'RS384' | 'RS512' | 'ES256' | 'ES384' | 'ES512' | 'PS256' | 'PS384' | 'PS512' | 'none';
}

export interface JWTVerifyOptions {
  algorithms?: Array<'HS256' | 'HS384' | 'HS512' | 'RS256' | 'RS384' | 'RS512' | 'ES256' | 'ES384' | 'ES512' | 'PS256' | 'PS384' | 'PS512' | 'none'>;
  ignoreExpiration?: boolean;
}
