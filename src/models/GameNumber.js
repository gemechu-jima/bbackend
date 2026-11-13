const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const GameNumber = sequelize.define('GameNumber', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  gameId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  number: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('AVAILABLE', 'RESERVED', 'CONFIRMED'),
    defaultValue: 'AVAILABLE',
    allowNull: false,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null,
  },
  createdById: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null,
  },
  confirmedById: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null,
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: null,
  },
}, {
  tableName: 'game_numbers',
  indexes: [
    {
      unique: true,
      fields: ['game_id', 'number'],
    },
  ],
});

module.exports = GameNumber;
