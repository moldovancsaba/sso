import { MongoClient, ObjectId } from 'mongodb';

const MONGODB_URI = 'mongodb+srv://moldovancsaba:togwa1-xyhcEp-mozceb@mongodb-thanperfect.zf2o0ix.mongodb.net/?retryWrites=true&w=majority&appName=mongodb-thanperfect';
const MONGODB_DB = 'session-spa';

export default async function handler(req, res) {
  const { method } = req;
  const { userId } = req.query;

  try {
    const client = await MongoClient.connect(MONGODB_URI);
    const db = client.db(MONGODB_DB);
    const users = db.collection('users');

    // Check if user exists
    const user = await users.findOne({ _id: new ObjectId(userId) });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    switch (method) {
      case 'PUT':
        // Update user
        const { username, isAdmin } = req.body;
        const updateData = {};
        
        if (username) updateData.username = username;
        if (typeof isAdmin === 'boolean') {
          updateData['permissions.isAdmin'] = isAdmin;
          updateData['permissions.canViewUsers'] = isAdmin;
          updateData['permissions.canManageUsers'] = isAdmin;
        }

        await users.updateOne(
          { _id: new ObjectId(userId) },
          { $set: updateData }
        );

        // Log the update
        await users.updateOne(
          { _id: new ObjectId(userId) },
          {
            $push: {
              activityLog: {
                action: 'user_updated',
                timestamp: new Date(),
                details: {
                  updatedFields: Object.keys(updateData),
                  updatedBy: req.session?.userId || 'system'
                }
              }
            }
          }
        );

        res.json({ message: 'User updated successfully' });
        break;

      case 'DELETE':
        // Delete user
        await users.deleteOne({ _id: new ObjectId(userId) });
        res.json({ message: 'User deleted successfully' });
        break;

      default:
        res.setHeader('Allow', ['PUT', 'DELETE']);
        res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
}
