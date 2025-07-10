import { Registry, Counter, Histogram } from 'prom-client';
export declare const register: Registry<"text/plain; version=0.0.4; charset=utf-8">;
export declare const authenticationAttempts: Counter<"status">;
export declare const tokenUsageCounter: Counter<"type">;
export declare const authLatency: Histogram<"type">;
export declare const consentChanges: Counter<"type" | "status">;
export declare const errorCounter: Counter<"type">;
export declare const metrics: {
    trackAuth: (success: boolean) => void;
    trackTokenUsage: (type: string) => void;
    trackAuthLatency: (type: string, durationMs: number) => void;
    trackConsentChange: (type: string, granted: boolean) => void;
    trackError: (type: string) => void;
};
//# sourceMappingURL=metrics.d.ts.map