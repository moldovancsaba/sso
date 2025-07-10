import { Identity } from '../types/identity';
export declare class IdentityManager {
    private db;
    constructor();
    init(): Promise<void>;
    /**
     * Generates a new identity with random gametag, emoji, and color
     */
    generate(): Promise<Identity>;
    /**
     * Gets existing identity for a user or creates a new one
     */
    getOrCreate(userId: string): Promise<Identity>;
}
//# sourceMappingURL=manager.d.ts.map