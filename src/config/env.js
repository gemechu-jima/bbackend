require('dotenv').config();
const path = require('path');

const env = {
  app: {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: Number(process.env.PORT) || 3000,
    baseUrl: process.env.BASE_URL || 'http://localhost:3000',
    jwtSecret: process.env.JWT_SECRET || 'super_secret_bingo_jwt_key_2026_change_in_production',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  database: {
    dialect: (process.env.DB_DIALECT || 'mysql').toLowerCase(),
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || ((process.env.DB_DIALECT || 'mysql').toLowerCase() === 'postgres' ? 5432 : 3306),
    database: process.env.DB_NAME || 'bingo_db',
    username: process.env.DB_USER || ((process.env.DB_DIALECT || 'mysql').toLowerCase() === 'postgres' ? 'postgres' : 'root'),
    password: process.env.DB_PASSWORD || '',
    storage: process.env.DB_STORAGE || path.join(process.cwd(), 'database.sqlite'),
    ssl: process.env.DB_SSL === 'true' || process.env.DB_SSL === '1',
  },
};

module.exports = env;

