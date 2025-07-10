import { User } from '../types/user';
interface TokenOptions {
    audience: string;
    nonce?: string;
    authTime: number;
    acr?: string;
    amr?: string[];
    azp?: string;
}
export declare class TokenService {
    private keyManager;
    constructor();
    createIdToken(user: User, options: TokenOptions): Promise<string>;
    verifyIdToken(token: string, options: {
        audience: string;
        nonce?: string;
    }): Promise<object>;
}
export {};
//# sourceMappingURL=token.d.ts.map