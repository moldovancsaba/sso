// Mock middleware functions
export const validateTenant = (handler) => handler;
export const rateLimit = (handler) => handler;
export const requestLogger = (handler) => handler;
export const composeMiddleware = (...middleware) => (handler) => handler;
