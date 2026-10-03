const { mongoose, autoId, idField, fk, money, schemaOptions } = require('./_helpers');

const taskSchema = new mongoose.Schema({
  taskId: idField,                                   // TSK0001
  title: { type: String, required: true, trim: true },
  description: String,
  eventId: fk(),                                     // optional: task belongs to an event
  fundraiserId: fk(),                                // optional: task belongs to a fundraiser
  assignedVolunteerId: fk(true),
  assignedBy: fk(true),
  priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
  dueDate: Date,
  status: { type: String, enum: ['Pending', 'In Progress', 'Completed', 'Cancelled'], default: 'Pending', index: true },
  taskBudget: money(),                               // spending LIMIT only, not a transaction
  completedAt: Date
}, schemaOptions);

taskSchema.index({ assignedVolunteerId: 1, status: 1 });

autoId(taskSchema, 'taskId', 'TSK');
module.exports = mongoose.models.Task || mongoose.model('Task', taskSchema);
