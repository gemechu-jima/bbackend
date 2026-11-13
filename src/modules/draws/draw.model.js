const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const Draw = sequelize.define('Draw', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  gameId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('COMPLETED'),
    defaultValue: 'COMPLETED',
    allowNull: false,
  },
  winners: {
    type: DataTypes.JSON, // array of { place, reservationId, number, displayName, prizeAmount }
    allowNull: false,
  },
  drawnBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
}, {
  tableName: 'draws',
  timestamps: true,
});

module.exports = Draw;

