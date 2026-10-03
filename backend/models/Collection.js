const { mongoose, autoId, idField, fk, money, schemaOptions } = require('./_helpers');

const collectionSchema = new mongoose.Schema({
  collectionId: idField,                             // COL0001
  fundraiserId: fk(true),
  taskId: fk(),
  collectedBy: fk(true),                             // volunteer userId
  contributor: { name: { type: String, trim: true }, contact: String },
  amount: money({ required: true, min: 0.01 }),
  method: { type: String, enum: ['Cash', 'UPI', 'Card', 'Bank Transfer'], default: 'Cash' },
  receiptNumber: String,
  collectedOn: { type: Date, default: Date.now },
  verificationStatus: { type: String, enum: ['Pending', 'Verified', 'Rejected'], default: 'Pending', index: true },
  verifiedBy: fk(),
  verifiedAt: Date,
  rejectionReason: String
}, schemaOptions);

collectionSchema.index({ fundraiserId: 1, verificationStatus: 1 });

autoId(collectionSchema, 'collectionId', 'COL');
module.exports = mongoose.models.Collection || mongoose.model('Collection', collectionSchema);
