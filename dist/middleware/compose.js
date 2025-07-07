export function composeMiddleware(...middlewares) {
    return function (handler) {
        return async function (req, res) {
            // Creates a promise chain of middleware executions
            const chain = middlewares.map(middleware => async (next) => {
                await middleware(req, res, next);
            });
            // Execute the chain
            let index = 0;
            const next = async () => {
                if (index < chain.length) {
                    await chain[index++](next);
                }
                else {
                    await handler(req, res);
                }
            };
            try {
                await next();
            }
            catch (error) {
                console.error('Middleware chain error:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        };
    };
}
//# sourceMappingURL=compose.js.map