import dbConnect from '../../lib/db';
import Identifier from '../../models/Identifier';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { oldValue, newValue } = req.body;
  if (!oldValue || !newValue) return res.status(400).json({ error: 'Missing values' });

  await dbConnect();
  const record = await Identifier.findOne({ value: oldValue });
  if (!record) return res.status(404).json({ error: 'Identifier not found' });

  record.value = newValue;
  record.activities.push({ type: 'updated' });
  await record.save();

  res.json({ success: true });
}
