const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const Setting = sequelize.define(
  'Setting',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    platformName: {
      type: DataTypes.STRING(120),
      allowNull: false,
      defaultValue: 'Bingo Platform',
    },
    currency: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: 'ETB',
    },
    defaultReservationMinutes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 30,
    },
  },
  {
    tableName: 'settings',
    timestamps: true,
  }
);

module.exports = Setting;