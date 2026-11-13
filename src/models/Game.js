const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Game = sequelize.define('Game', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  totalNumbers: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 50,
  },
  status: {
    type: DataTypes.ENUM('PENDING', 'ACTIVE', 'DRAWING', 'COMPLETED', 'CANCELLED'),
    defaultValue: 'PENDING',
    allowNull: false,
  },
  numberPrice: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 100.00,
    allowNull: false,
  },
  reservationMinutes: {
    type: DataTypes.INTEGER,
    defaultValue: 5,
    allowNull: false,
  },
  prizeDistribution: {
    type: DataTypes.JSON,
    defaultValue: {
      first: 60,
      second: 20,
      third: 10,
      fourth: 0,
      system: 10,
    },
    allowNull: false,
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
}, {
  tableName: 'games',
});

module.exports = Game;

