import { MongoClient } from 'mongodb';

const MONGODB_URI = 'mongodb+srv://moldovancsaba:togwa1-xyhcEp-mozceb@mongodb-thanperfect.zf2o0ix.mongodb.net/?retryWrites=true&w=majority&appName=mongodb-thanperfect';
const MONGODB_DB = 'session-spa';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }

  try {
    const client = await MongoClient.connect(MONGODB_URI);
    const db = client.db(MONGODB_DB);
    const users = db.collection('users');

    // Try to find existing user
    let user = await users.findOne({ username });

    if (!user) {
      // Check if this is the first user (make them admin)
      const isFirstUser = (await users.countDocuments({})) === 0;

      // Create new user
      user = {
        username,
        permissions: {
          isAdmin: isFirstUser,
          canViewUsers: isFirstUser,
          canManageUsers: isFirstUser
        },
        createdAt: new Date(),
        lastLogin: new Date()
      };

      await users.insertOne(user);
    }

    // Set session
    req.session = req.session || {};
    req.session.userId = user._id;

    res.status(200).json({
      message: 'User registered successfully',
      user: {
        id: user._id,
        username: user.username,
        permissions: user.permissions
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
}
