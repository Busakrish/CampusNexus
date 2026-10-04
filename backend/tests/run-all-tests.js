require('dotenv').config();
const { connectDB, disconnectDB } = require('../config/db');

// Test stats
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures = [];

global.assert = (condition, message) => {
  totalTests++;
  if (!condition) {
    failedTests++;
    const err = new Error(`Assertion Failed: ${message}`);
    failures.push({ message, stack: err.stack });
    console.error(`  ❌ FAIL: ${message}`);
  } else {
    passedTests++;
    console.log(`  ✅ PASS: ${message}`);
  }
};

global.assertEqual = (actual, expected, message) => {
  totalTests++;
  if (actual !== expected) {
    failedTests++;
    const msg = `${message} (Expected: ${JSON.stringify(expected)}, Got: ${JSON.stringify(actual)})`;
    failures.push({ message: msg, stack: new Error().stack });
    console.error(`  ❌ FAIL: ${msg}`);
  } else {
    passedTests++;
    console.log(`  ✅ PASS: ${message}`);
  }
};

async function runTestSuites() {
  console.log('\n================================================================');
  console.log('🧪 CAMPUSNEXUS AUTOMATED TEST SUITE RUNNER');
  console.log('================================================================\n');

  await connectDB();

  try {
    console.log('\n--- 1. Running Auth & RBAC Test Suite ---');
    await require('./auth-rbac.test.js')();

    console.log('\n--- 2. Running Events, Capacity, Registrations & QR Check-in Test Suite ---');
    await require('./events-registration-tickets.test.js')();

    console.log('\n--- 3. Running Merchandise, Stock & Order Historical Pricing Test Suite ---');
    await require('./merchandise-orders.test.js')();

    console.log('\n--- 4. Running Fundraisers, Expenses, Reimbursements & Finance Test Suite ---');
    await require('./finance-workflows.test.js')();

    console.log('\n================================================================');
    console.log('📊 TEST EXECUTION SUMMARY:');
    console.log(`   Total Assertions: ${totalTests}`);
    console.log(`   Passed:           ${passedTests}`);
    console.log(`   Failed:           ${failedTests}`);
    console.log('================================================================\n');

    if (failedTests > 0) {
      console.error('❌ FAILURES REPORT:');
      failures.forEach((f, idx) => {
        console.error(`  ${idx + 1}) ${f.message}`);
      });
      await disconnectDB();
      process.exit(1);
    } else {
      console.log('🎉 ALL TEST SUITES PASSED WITH ZERO FAILURES!\n');
      await disconnectDB();
      process.exit(0);
    }
  } catch (err) {
    console.error('\n🚨 Unexpected Test Suite Crash:', err);
    await disconnectDB();
    process.exit(1);
  }
}

if (require.main === module) {
  runTestSuites();
}

module.exports = runTestSuites;
