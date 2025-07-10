import { Registry, Counter, Histogram } from 'prom-client';
// Create a Registry
export const register = new Registry();
// Authentication metrics
export const authenticationAttempts = new Counter({
    name: 'auth_attempts_total',
    help: 'Total number of authentication attempts',
    labelNames: ['status'] // 'success' or 'failure'
});
export const tokenUsageCounter = new Counter({
    name: 'token_usage_total',
    help: 'Total number of token usages',
    labelNames: ['type'] // 'access', 'refresh', etc.
});
export const authLatency = new Histogram({
    name: 'auth_request_duration_seconds',
    help: 'Authentication request duration in seconds',
    labelNames: ['type']
});
// Consent metrics
export const consentChanges = new Counter({
    name: 'consent_changes_total',
    help: 'Total number of consent changes',
    labelNames: ['type', 'status'] // type: 'data_sharing', 'marketing', etc., status: 'granted', 'revoked'
});
// Error metrics
export const errorCounter = new Counter({
    name: 'error_total',
    help: 'Total number of errors',
    labelNames: ['type'] // 'auth', 'token', 'consent', etc.
});
// Register all metrics
register.registerMetric(authenticationAttempts);
register.registerMetric(tokenUsageCounter);
register.registerMetric(authLatency);
register.registerMetric(consentChanges);
register.registerMetric(errorCounter);
// Helper functions for incrementing metrics
export const metrics = {
    trackAuth: (success) => {
        const status = success ? 'success' : 'failure';
        authenticationAttempts.labels(status).inc();
    },
    trackTokenUsage: (type) => {
        tokenUsageCounter.labels(type).inc();
    },
    trackAuthLatency: (type, durationMs) => {
        authLatency.labels(type).observe(durationMs / 1000);
    },
    trackConsentChange: (type, granted) => {
        const status = granted ? 'granted' : 'revoked';
        consentChanges.labels(type, status).inc();
    },
    trackError: (type) => {
        errorCounter.labels(type).inc();
    }
};
//# sourceMappingURL=metrics.js.map