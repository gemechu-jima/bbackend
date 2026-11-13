require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { sequelize } = require('./modules');
const { startExpiryCron } = require('./tasks/expiry.task');
const ImageKit = require('imagekit');
// Import modular routers
const userRouter = require('./modules/users/user.router');
const gameRouter = require('./modules/games/game.router');
const numberRouter = require('./modules/numbers/number.router');
const paymentRouter = require('./modules/payments/payment.router');
const drawRouter = require('./modules/draws/draw.router');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});
// Serve uploaded payment screenshots statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.get('/api/imagekit-auth', (_req, res) => {
  // Generates { token, expire, signature }
  const authParams = imagekit.getAuthenticationParameters();
  res.json(authParams);
});
// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    dialect: sequelize.getDialect ? sequelize.getDialect() : (process.env.DB_DIALECT || 'mysql'),
  });
});

// Helper function to mount routes on both /api and /api/v1
function registerRoutes(prefix) {
  app.use(`${prefix}/users`, userRouter);
  app.use(`${prefix}/games`, gameRouter);
  app.use(`${prefix}/numbers`, numberRouter);
  app.use(`${prefix}/payments`, paymentRouter);
  app.use(`${prefix}/draws`, drawRouter);
}

// Mount on /api and /api/v1
registerRoutes('/api');
registerRoutes('/api/v1');

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Bingo Game Management API',
    version: '1.0.0',
    documentation: 'Mounting modular endpoints on /api and /api/v1',
    dialect: process.env.DB_DIALECT || 'mysql',
    modules: ['users', 'games', 'numbers', 'payments', 'draws', 'audit'],
  });
});

// Centralized error handling middleware
app.use((err, req, res, next) => {
  console.error('API Error:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
  });
});

// Start Server & Sync Database
async function startServer() {
  const currentDialect = sequelize.getDialect ? sequelize.getDialect() : (process.env.DB_DIALECT || 'mysql');
  try {
    console.log(`🔌 Connecting to ${currentDialect} database...`);
    await sequelize.authenticate();
    console.log(`✅ Database connection established successfully (${currentDialect}).`);

    // Sync models with database
    await sequelize.sync({ alter: false });
    console.log('✅ Sequelize models synchronized.');

    // Start background reservation expiration monitor
    startExpiryCron();

    app.listen(PORT, HOST, () => {
      console.log(`🚀 Bingo Backend Server running on:`);
      console.log(`   - Local:   http://localhost:${PORT}`);
      console.log(`   - Network: http://10.34.30.153:${PORT}`);
      console.log(`📡 Modular API available at:`);
      console.log(`   - Local:   http://localhost:${PORT}/api/`);
      console.log(`   - Network: http://10.34.30.153:${PORT}/api/`);
    });
  } catch (err) {
    console.error('❌ Unable to connect to the database:', err.message);
    console.log(`\n💡 Note: Check your database configuration for dialect [${currentDialect}] in .env`);
    console.log(`   Host: ${process.env.DB_HOST || 'localhost'}`);
    console.log(`   Port: ${process.env.DB_PORT || (process.env.DB_DIALECT === 'postgres' ? '5432' : '3306')}`);
    console.log(`   Database: ${process.env.DB_NAME || 'bingo_db'}`);
    console.log(`   User: ${process.env.DB_USER || 'root'}\n`);
    console.error('❌ Unable to connect to the database:', err.parent?.code || err.original?.code || err.name);
    console.error('🔍 Full details:', err.parent || err.original || err);

    // Allow server to run for static/health check inspection
    app.listen(PORT, HOST, () => {
      console.log(`⚠️ Server running on http://0.0.0.0:${PORT} (Database connection pending)`);
    });
  }
}

startServer();
