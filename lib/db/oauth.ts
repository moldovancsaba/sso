import { OAuthClient } from '../types/oauth';
import { Database } from './database';

export async function updateOAuthClient(
  db: Database,
  id: string,
  update: Partial<OAuthClient>
): Promise<OAuthClient | null> {
  if (!db) throw new Error('Database not initialized');

  const result = await db.collection('oauth_clients').findOneAndUpdate(
    { _id: id },
    {
      $set: {
        ...update,
        updatedAt: new Date().toISOString()
      }
    },
    { returnDocument: 'after' }
  );

  return result.value ? { ...result.value, id: result.value._id.toString() } : null;
}
