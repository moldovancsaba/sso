import winston from 'winston';
export declare const logger: winston.Logger;
export declare const auditLogger: {
    authEvent: (userId: string, event: string, success: boolean, details?: any) => void;
    tokenUsage: (tokenId: string, action: string, details?: any) => void;
    consentChange: (userId: string, consentType: string, status: boolean, details?: any) => void;
};
export declare const errorLogger: {
    logError: (error: Error, context?: any) => void;
};
//# sourceMappingURL=logger.d.ts.map