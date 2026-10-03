const mongoose = require('mongoose');

// ---- Human-readable ID generator (USR0001, EVT1001 ...) -------------------
const Counter = mongoose.models.Counter ||
  mongoose.model('Counter', new mongoose.Schema({ _id: String, seq: { type: Number, default: 0 } }, { versionKey: false }));

async function nextId(prefix, pad = 4, session) {
  const doc = await Counter.findOneAndUpdate(
    { _id: prefix }, { $inc: { seq: 1 } }, { new: true, upsert: true, session }
  );
  return prefix + String(doc.seq).padStart(pad, '0');
}

// Plugin: auto-assign a business ID (e.g. eventId) on first save.
function autoId(schema, field, prefix, pad = 4) {
  schema.pre('validate', async function () {
    if (this.isNew && !this[field]) this[field] = await nextId(prefix, pad, this.$session());
  });
}

// Business ID field definition (relationship key -- never use names as keys).
const idField = { type: String, required: true, unique: true, immutable: true, trim: true };
// Foreign key to another entity's business ID.
const fk = (required = false) => ({ type: String, required, trim: true, index: true });

// Money: rupees, rounded to 2 decimals, never negative.
const round2 = v => Math.round(Number(v) * 100) / 100;
const money = (extra = {}) => ({ type: Number, min: 0, default: 0, set: round2, ...extra });

const schemaOptions = {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (_doc, ret) => { delete ret._id; delete ret.id; delete ret.__v; delete ret.passwordHash; return ret; }
  },
  toObject: { virtuals: true }
};

module.exports = { mongoose, Counter, nextId, autoId, idField, fk, money, schemaOptions };
