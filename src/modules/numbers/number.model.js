const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const GameNumber = sequelize.define('GameNumber', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  gameId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'FK -> games.id',
  },
  number: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'The displayed bingo number (1..N)',
  },
  status: {
    type: DataTypes.ENUM('AVAILABLE', 'RESERVED', 'CONFIRMED'),
    defaultValue: 'AVAILABLE',
    allowNull: false,
    comment: 'Current lifecycle state of this number slot',
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null,
    comment: 'FK -> users.id (PLAYER who holds this number; null when AVAILABLE)',
  },
  createdById: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null,
    comment: 'FK -> users.id (ADMIN who created/seeded this number into the game)',
  },
  confirmedById: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null,
    comment: 'FK -> users.id (ADMIN who last confirmed or rejected this number; set on payment verify/reject)',
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: null,
    comment: 'Timestamp at which the RESERVED hold expires; null when AVAILABLE or CONFIRMED',
  },
}, {
  tableName: 'game_numbers',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['game_id', 'number'],
    },
  ],
});

module.exports = GameNumber;
