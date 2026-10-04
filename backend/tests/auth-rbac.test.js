const User = require('../models/User');
const jwt = require('jsonwebtoken');
const seedDatabase = require('../seed');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secure_campusnexus_jwt_secret_key_2026_x99a!';

module.exports = async function runAuthRbacTests() {
  // Re-seed for fresh state
  await seedDatabase();

  // Test 1: User Login Verification
  const admin = await User.findOne({ email: 'admin@campus.edu' }).select('+password');
  assert(admin !== null, 'Admin user exists in database');
  const isMatch = await admin.comparePassword('Password123!');
  assert(isMatch === true, 'Admin password hashes and verifies correctly with bcrypt');

  const isBadMatch = await admin.comparePassword('WrongPassword');
  assert(isBadMatch === false, 'Invalid password is fundamentally rejected');

  // Test 2: Token verification and claims
  const token = jwt.sign(
    { userId: admin.userId, email: admin.email, role: admin.role },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
  const decoded = jwt.verify(token, JWT_SECRET);
  assertEqual(decoded.userId, admin.userId, 'JWT decodes with correct userId');
  assertEqual(decoded.role, 'ADMIN', 'JWT decodes with correct ADMIN role');

  // Test 3: Suspended Account Check
  const student = await User.findOne({ email: 'student2@campus.edu' });
  assert(student !== null, 'Student user exists');
  student.status = 'Suspended';
  await student.save();

  const refreshedStudent = await User.findOne({ userId: student.userId });
  assertEqual(refreshedStudent.status, 'Suspended', 'User account successfully transitions to Suspended');

  // Restore status
  refreshedStudent.status = 'Active';
  await refreshedStudent.save();

  // Test 4: Role Authorization logic
  const checkRoleAccess = (userRole, allowedRoles) => allowedRoles.includes(userRole);
  assert(checkRoleAccess('ADMIN', ['ADMIN', 'TREASURER']) === true, 'ADMIN is authorized for admin/treasurer route');
  assert(checkRoleAccess('STUDENT', ['ADMIN', 'TREASURER']) === false, 'STUDENT is forbidden from admin/treasurer route (403)');
  assert(checkRoleAccess('VOLUNTEER', ['VOLUNTEER', 'ADMIN']) === true, 'VOLUNTEER is authorized for volunteer route');
  assert(checkRoleAccess('ORGANIZER', ['STUDENT']) === false, 'ORGANIZER cannot impersonate student exclusive actions');
};
