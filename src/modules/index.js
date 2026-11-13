const { sequelize, Sequelize } = require('../config/database');

const User = require('./users/user.model');
const Game = require('./games/game.model');
const GameNumber = require('./numbers/number.model');
const PaymentProof = require('./payments/payment.model');
const Draw = require('./draws/draw.model');
const AuditEvent = require('./audit/audit.model');

// Associations
// Game <-> GameNumbers
Game.hasMany(GameNumber, { foreignKey: 'gameId', as: 'numbers', onDelete: 'CASCADE' });
GameNumber.belongsTo(Game, { foreignKey: 'gameId', as: 'game' });

// User (PLAYER) <-> GameNumbers — who holds the number
User.hasMany(GameNumber, { foreignKey: 'userId', as: 'numbers' });
GameNumber.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// User (ADMIN) <-> GameNumbers — who created/seeded the number
User.hasMany(GameNumber, { foreignKey: 'createdById', as: 'createdNumbers' });
GameNumber.belongsTo(User, { foreignKey: 'createdById', as: 'createdByAdmin' });

// User (ADMIN) <-> GameNumbers — who confirmed or rejected the number
User.hasMany(GameNumber, { foreignKey: 'confirmedById', as: 'confirmedNumbers' });
GameNumber.belongsTo(User, { foreignKey: 'confirmedById', as: 'confirmedByAdmin' });

// GameNumber <-> PaymentProof
GameNumber.hasMany(PaymentProof, { foreignKey: 'numberId', as: 'paymentProofs' });
PaymentProof.belongsTo(GameNumber, { foreignKey: 'numberId', as: 'number' });

// User <-> PaymentProof
User.hasMany(PaymentProof, { foreignKey: 'userId', as: 'paymentProofs' });
PaymentProof.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Game <-> PaymentProof
Game.hasMany(PaymentProof, { foreignKey: 'gameId', as: 'paymentProofs' });
PaymentProof.belongsTo(Game, { foreignKey: 'gameId', as: 'game' });

// Game <-> Draws
Game.hasMany(Draw, { foreignKey: 'gameId', as: 'draws' });
Draw.belongsTo(Game, { foreignKey: 'gameId', as: 'game' });

module.exports = {
  sequelize,
  Sequelize,
  User,
  Game,
  GameNumber,
  PaymentProof,
  Draw,
  AuditEvent,
};
