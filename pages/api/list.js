import dbConnect from '../../lib/db';
import Identifier from '../../models/Identifier';

export default async function handler(req, res) {
  await dbConnect();
  const data = await Identifier.find({});
  res.json(data);
}
