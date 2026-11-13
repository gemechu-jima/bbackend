const { Op } = require('sequelize');
const PaymentProof = require('./payment.model');
const GameNumber = require('../numbers/number.model');
const AuditEvent = require('../audit/audit.model');
const { sequelize } = require('../../config/database');

class PaymentService {
  async uploadProof({ reservationId, numberId, userId, provider, transactionReference, proofUrl: providedProofUrl, file }) {
    const targetNumberId = Number(numberId || reservationId);
    if (!targetNumberId) {
      const error = new Error('Number or Reservation ID is required');
      error.status = 400;
      throw error;
    }

    const gameNumber = await GameNumber.findByPk(targetNumberId);
    if (!gameNumber) {
      const error = new Error('Game number / reservation not found');
      error.status = 404;
      throw error;
    }

    let proofUrl = providedProofUrl || null;
    if (file) {
      const env = require('../../config/env');
      const baseUrl = (env.app.baseUrl || process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
      proofUrl = `${baseUrl}/uploads/${file.filename}`;
    }

    return await PaymentProof.create({
      numberId: targetNumberId,
      reservationId: targetNumberId,
      userId: gameNumber.userId || userId,
      gameId: gameNumber.gameId,
      amount: 100.00,
      provider: provider || 'CBE',
      transactionReference: transactionReference || null,
      proofUrl,
      status: 'UNDER_REVIEW',
    });
  }

  async getAll() {
    return await PaymentProof.findAll({
      order: [['createdAt', 'DESC']],
    });
  }

  async getByReservation(reservationId) {
    const id = Number(reservationId);
    return await PaymentProof.findAll({
      where: {
        [Op.or]: [{ reservationId: id }, { numberId: id }],
      },
    });
  }

  async verify(id, reviewerId = 1) {
    const t = await sequelize.transaction();
    try {
      const proof = await PaymentProof.findByPk(id, { transaction: t });
      if (!proof) {
        const error = new Error('Payment proof not found');
        error.status = 404;
        throw error;
      }

      proof.status = 'VERIFIED';
      proof.reviewedBy = reviewerId;
      proof.reviewedAt = new Date();
      await proof.save({ transaction: t });

      // Mark the number as CONFIRMED and record which admin confirmed it
      const targetId = proof.numberId || proof.reservationId;
      if (targetId) {
        await GameNumber.update(
          { status: 'CONFIRMED', confirmedById: reviewerId },
          { where: { id: targetId }, transaction: t }
        );
      }

      await t.commit();
      return proof;
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  async reject(id, note, reviewerId = 1) {
    const t = await sequelize.transaction();
    try {
      const proof = await PaymentProof.findByPk(id, { transaction: t });
      if (!proof) {
        const error = new Error('Payment proof not found');
        error.status = 404;
        throw error;
      }

      proof.status = 'REJECTED';
      proof.reviewNote = note || 'Rejected by administrator';
      proof.reviewedBy = reviewerId;
      proof.reviewedAt = new Date();
      await proof.save({ transaction: t });

      // Release number back to AVAILABLE and record which admin rejected it
      const targetId = proof.numberId || proof.reservationId;
      if (targetId) {
        await GameNumber.update(
          { status: 'AVAILABLE', userId: null, expiresAt: null, confirmedById: reviewerId },
          { where: { id: targetId }, transaction: t }
        );
      }

      await t.commit();
      return proof;
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  async reportMistake(id, reason, actorId = null) {
    return await AuditEvent.create({
      actorId,
      action: 'PAYMENT_MISTAKE_REPORT',
      reason: reason || 'Mistake reported during payment audit',
      details: { proofId: Number(id) },
    });
  }
}

module.exports = new PaymentService();
