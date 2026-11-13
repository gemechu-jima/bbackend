const { Sequelize } = require('sequelize');
const path = require('path');
const env = require('./env');

let sequelize;

const commonOptions = {
  logging: false,
  define: {
    timestamps: true,
    underscored: true,
    freezeTableName: true,
  },
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
};

if (process.env.DATABASE_URL) {
  const neon = require('@neondatabase/serverless');
  const ws = require('ws');
  neon.neonConfig.webSocketConstructor = ws;

  sequelize = new Sequelize(process.env.DATABASE_URL, {
    ...commonOptions,
    dialect: 'postgres',
    dialectModule: neon, // Tunnels PostgreSQL over HTTPS port 443 (bypasses port 5432 block)
  });
  console.log('🐘 Using Neon PostgreSQL Database over WebSocket/HTTPS (port 443)');
} else if (env.app.nodeEnv === 'development') {
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: env.database.storage || path.join(process.cwd(), 'database.sqlite'),
    logging: false,
    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: true,
    },
  });
  console.log('📦 Using Temporary Local SQLite File Database (Ports Bypassed)');
} else {
  const isPostgres = env.database.dialect === 'postgres';
  sequelize = new Sequelize(
    env.database.database,
    env.database.username,
    env.database.password,
    {
      ...commonOptions,
      host: env.database.host,
      port: env.database.port,
      dialect: isPostgres ? 'postgres' : 'mysql',
      dialectOptions: env.database.ssl
        ? {
            ssl: {
              require: true,
              rejectUnauthorized: false,
            },
          }
        : {},
    }
  );
}

module.exports = sequelize;
module.exports.sequelize = sequelize;
module.exports.Sequelize = Sequelize;
module.exports.default = sequelize;