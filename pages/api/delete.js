import dbConnect from '../../lib/db';
import Identifier from '../../models/Identifier';

export default async function handler(req, res) {
  if (req.method !== 'DELETE') return res.status(405).end();

  const { value } = req.body;
  if (!value) return res.status(400).json({ error: 'Missing value' });

  await dbConnect();
  const result = await Identifier.deleteOne({ value });
  if (result.deletedCount === 0) return res.status(404).json({ error: 'Identifier not found' });

  res.json({ success: true });
}
