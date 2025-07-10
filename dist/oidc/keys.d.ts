export interface JWK {
    kty: 'RSA';
    use: 'sig';
    kid: string;
    n: string;
    e: string;
    alg: 'RS256';
}
export declare class KeyManager {
    private static instance;
    private currentKeyPair;
    private constructor();
    static getInstance(): KeyManager;
    initialize(): Promise<void>;
    private getKeyComponents;
    getJWKS(): Promise<{
        keys: JWK[];
    }>;
    sign(payload: object, options: {
        expiresIn: number;
    }): Promise<string>;
    verify(token: string): Promise<object>;
}
//# sourceMappingURL=keys.d.ts.map