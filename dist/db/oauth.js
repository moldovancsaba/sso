export async function updateOAuthClient(db, id, update) {
    if (!db)
        throw new Error('Database not initialized');
    const result = await db.collection('oauth_clients').findOneAndUpdate({ _id: id }, {
        $set: Object.assign(Object.assign({}, update), { updatedAt: new Date().toISOString() })
    }, { returnDocument: 'after' });
    return result.value ? Object.assign(Object.assign({}, result.value), { id: result.value._id.toString() }) : null;
}
//# sourceMappingURL=oauth.js.map