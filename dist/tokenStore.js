const tokenMap = new Map();
export function createToken(identifier) {
    const token = crypto.randomUUID();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
    tokenMap.set(token, { identifier, expiresAt });
    return token;
}
export function validateToken(token) {
    const session = tokenMap.get(token);
    if (!session || session.expiresAt < Date.now())
        return null;
    return session.identifier;
}
//# sourceMappingURL=tokenStore.js.map