import mongoose from 'mongoose';

const ActivitySchema = new mongoose.Schema({
  type: { type: String, enum: ['created', 'used', 'updated'], required: true },
  timestamp: { type: Date, default: Date.now },
  source: { type: String }
}, { _id: false });

const IdentifierSchema = new mongoose.Schema({
  value: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now },
  activities: [ActivitySchema]
});

export default mongoose.models.Identifier || mongoose.model('Identifier', IdentifierSchema);
