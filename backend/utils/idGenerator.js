const crypto = require('crypto');

/**
 * Generates canonical structured entity IDs with uniform prefix and random hexadecimal/numeric entropy.
 * Stable, unambiguous, and safe as foreign keys.
 */
function generateId(prefix = 'ID') {
  const randomHex = crypto.randomBytes(4).toString('hex').toUpperCase();
  const timestamp = Date.now().toString(36).toUpperCase().slice(-4);
  return `${prefix}-${timestamp}${randomHex}`;
}

const entityGenerators = {
  user: () => generateId('USR'),
  student: () => generateId('STU'),
  organization: () => generateId('ORG'),
  membership: () => generateId('MEM'),
  payment: () => generateId('PAY'),
  event: () => generateId('EVT'),
  registration: () => generateId('REG'),
  ticket: () => generateId('TKT'),
  attendance: () => generateId('ATT'),
  product: () => generateId('PRD'),
  order: () => generateId('ORD'),
  orderItem: () => generateId('ITM'),
  task: () => generateId('TSK'),
  fundraiser: () => generateId('FND'),
  collection: () => generateId('COL'),
  expense: () => generateId('EXP'),
  reimbursement: () => generateId('RMB'),
  budget: () => generateId('BDG'),
  transaction: () => generateId('TXN'),
  announcement: () => generateId('ANN'),
  notification: () => generateId('NOT')
};

module.exports = {
  generateId,
  ...entityGenerators
};
