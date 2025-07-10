import winston from 'winston';
import { format } from 'winston';
const { combine, timestamp, json } = format;
// Define custom log levels
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
};
// Create the logger instance
export const logger = winston.createLogger({
    levels,
    format: combine(timestamp({
        format: 'YYYY-MM-DDTHH:mm:ss.SSSZ'
    }), json()),
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' }),
        new winston.transports.Console({
            format: combine(format.colorize(), format.simple())
        })
    ]
});
// Export log categories for better organization
export const auditLogger = {
    authEvent: (userId, event, success, details = {}) => {
        logger.info('Authentication Event', Object.assign(Object.assign({ type: 'AUTH', userId,
            event,
            success }, details), { timestamp: new Date().toISOString() }));
    },
    tokenUsage: (tokenId, action, details = {}) => {
        logger.info('Token Usage', Object.assign(Object.assign({ type: 'TOKEN', tokenId,
            action }, details), { timestamp: new Date().toISOString() }));
    },
    consentChange: (userId, consentType, status, details = {}) => {
        logger.info('Consent Change', Object.assign(Object.assign({ type: 'CONSENT', userId,
            consentType,
            status }, details), { timestamp: new Date().toISOString() }));
    }
};
// Error tracking with enhanced context
export const errorLogger = {
    logError: (error, context = {}) => {
        logger.error('Application Error', {
            type: 'ERROR',
            error: {
                name: error.name,
                message: error.message,
                stack: error.stack,
            },
            context,
            timestamp: new Date().toISOString()
        });
    }
};
//# sourceMappingURL=logger.js.map