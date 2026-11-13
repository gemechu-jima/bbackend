const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const AuditEvent = sequelize.define('AuditEvent', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  actorId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  action: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  details: {
    type: DataTypes.JSON,
    allowNull: true,
  },
}, {
  tableName: 'audit_events',
  timestamps: true,
});

module.exports = AuditEvent;

