require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const { connectDB } = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Enable CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static Frontend Serving
app.use(express.static(path.join(__dirname, '../frontend')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    system: 'CampusNexus - Student Organization Management System',
    timestamp: new Date().toISOString()
  });
});

// Mount Routes Helper
const mountRoutes = (prefix = '/api') => {
  app.use(`${prefix}/auth`, require('./routes/auth'));
  app.use(`${prefix}/users`, require('./routes/users'));
  app.use(`${prefix}/organizations`, require('./routes/organizations'));
  app.use(`${prefix}/memberships`, require('./routes/memberships'));
  app.use(`${prefix}/events`, require('./routes/events'));
  app.use(`${prefix}/registrations`, require('./routes/registrations'));
  app.use(`${prefix}/tickets`, require('./routes/tickets'));
  app.use(`${prefix}/attendance`, require('./routes/attendance'));
  app.use(`${prefix}/products`, require('./routes/products'));
  app.use(`${prefix}/orders`, require('./routes/orders'));
  app.use(`${prefix}/tasks`, require('./routes/tasks'));
  app.use(`${prefix}/fundraisers`, require('./routes/fundraisers'));
  app.use(`${prefix}/collections`, require('./routes/collections'));
  app.use(`${prefix}/expenses`, require('./routes/expenses'));
  app.use(`${prefix}/reimbursements`, require('./routes/reimbursements'));
  app.use(`${prefix}/budgets`, require('./routes/budgets'));
  app.use(`${prefix}/transactions`, require('./routes/transactions'));
  app.use(`${prefix}/announcements`, require('./routes/announcements'));
  app.use(`${prefix}/notifications`, require('./routes/notifications'));
  app.use(`${prefix}/dashboard`, require('./routes/dashboard'));
};

mountRoutes('/api');
mountRoutes('/api/v1');

// SPA fallback for HTML pages or 404 API handling
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API route not found: ${req.originalUrl}`,
    code: 'ROUTE_NOT_FOUND'
  });
});

// Centralized error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

if (require.main === module) {
  connectDB().then(async () => {
    try {
      const User = require('./models/User');
      const userCount = await User.countDocuments();
      if (userCount === 0) {
        console.log('[Startup] Database is empty. Auto-seeding initial demo records...');
        const seedDatabase = require('./seed');
        await seedDatabase();
      }
    } catch (seedErr) {
      console.warn('[Startup] Auto-seed check notice:', seedErr.message);
    }

    app.listen(PORT, () => {
      console.log(`\n======================================================`);
      console.log(`🚀 CampusNexus Server running on http://localhost:${PORT}`);
      console.log(`🌐 Frontend Portal: http://localhost:${PORT}/login.html`);
      console.log(`======================================================\n`);
    });
  });
}

module.exports = app;

