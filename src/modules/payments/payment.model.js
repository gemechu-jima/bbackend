const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const PaymentProof = sequelize.define('PaymentProof', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  numberId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  reservationId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  gameId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 100.00,
  },
  provider: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'CBE',
  },
  transactionReference: {
    type: DataTypes.STRING(150),
    allowNull: true,
  },
  proofUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('SUBMITTED', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED'),
    defaultValue: 'UNDER_REVIEW',
    allowNull: false,
  },
  reviewNote: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  reviewedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  reviewedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'payment_proofs',
  timestamps: true,
});

module.exports = PaymentProof;
