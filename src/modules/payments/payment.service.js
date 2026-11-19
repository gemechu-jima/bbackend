const { Op } = require('sequelize');
const PaymentProof = require('./payment.model');
const GameNumber = require('../numbers/number.model');
const AuditEvent = require('../audit/audit.model');
const { sequelize } = require('../../config/database');
const { detectPaymentProvider } = require('../../utils/paymentDetector');

class PaymentService {
  async checkReference({ reference, userId, gameId, reservationId, numberId }) {
    if (!reference || typeof reference !== 'string' || !reference.trim()) {
      return {
        isUnique: false,
        detectedProvider: null,
        message: 'Transaction reference is required',
      };
    }

    const cleanRef = reference.trim();
    const detectedProvider = detectPaymentProvider(cleanRef);

    const existing = await PaymentProof.findOne({
      where: {
        transactionReference: {
          [Op.like]: cleanRef,
        },
      },
      order: [['createdAt', 'DESC']],
    });

    if (!existing) {
      return {
        isUnique: true,
        detectedProvider,
        message: 'Reference number is unique and available.',
      };
    }

    if (existing.status === 'VERIFIED') {
      return {
        isUnique: false,
        detectedProvider,
        message: 'This transaction reference has already been verified and used.',
      };
    }

    if (existing.status === 'UNDER_REVIEW') {
      const targetId = Number(numberId || reservationId);
      const isSameUser = userId && Number(existing.userId) === Number(userId);
      const isSameGame = gameId && Number(existing.gameId) === Number(gameId);
      const isSameNumber = targetId && (Number(existing.numberId) === targetId || Number(existing.reservationId) === targetId);

      if (isSameUser && isSameNumber) {
        return {
          isUnique: true,
          isPendingForCurrent: true,
          detectedProvider,
          message: 'This reference is already submitted and under review for your reservation.',
        };
      }

      if (isSameUser && isSameGame) {
        return {
          isUnique: true,
          detectedProvider,
          message: 'Valid reference for multi-reservation checkout.',
        };
      }

      return {
        isUnique: false,
        detectedProvider,
        message: 'This transaction reference is currently under review for another reservation.',
      };
    }

    if (existing.status === 'REJECTED') {
      return {
        isUnique: true,
        detectedProvider,
        message: 'Reference was previously rejected and can be resubmitted with corrected proof.',
      };
    }

    return {
      isUnique: true,
      detectedProvider,
      message: 'Reference number is available.',
    };
  }

  async uploadProof({ reservationId, numberId, userId, provider, transactionReference, proofUrl: providedProofUrl, file }) {
    const targetNumberId = Number(numberId || reservationId);
    if (!targetNumberId) {
      const error = new Error('Number or Reservation ID is required');
      error.status = 400;
      throw error;
    }

    const cleanRef = transactionReference ? String(transactionReference).trim() : null;
    if (!cleanRef) {
      const error = new Error('Transaction reference number is required');
      error.status = 400;
      throw error;
    }

    const gameNumber = await GameNumber.findByPk(targetNumberId);
    if (!gameNumber) {
      const error = new Error('Game number / reservation not found');
      error.status = 404;
      throw error;
    }

    const targetUserId = gameNumber.userId || userId;
    const targetGameId = gameNumber.gameId;
    const autoDetectedProvider = detectPaymentProvider(cleanRef);
    const resolvedProvider = provider || autoDetectedProvider || 'CBE';

    // Enforce uniqueness: Check if reference already exists in VERIFIED or UNDER_REVIEW
    const existing = await PaymentProof.findOne({
      where: {
        transactionReference: { [Op.like]: cleanRef },
        status: { [Op.in]: ['VERIFIED', 'UNDER_REVIEW'] },
      },
      order: [['createdAt', 'DESC']],
    });

    if (existing) {
      const isSameUser = Number(existing.userId) === Number(targetUserId);
      const isSameGame = Number(existing.gameId) === Number(targetGameId);
      const timeDiff = Math.abs(Date.now() - new Date(existing.createdAt).getTime());
      const isSameBatch = isSameUser && isSameGame && timeDiff < 5 * 60 * 1000;

      if (existing.status === 'VERIFIED' || !isSameBatch) {
        const error = new Error(`Transaction reference '${cleanRef}' has already been used for another payment.`);
        error.status = 409;
        throw error;
      }
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
      userId: targetUserId,
      gameId: targetGameId,
      amount: 100.00,
      provider: resolvedProvider,
      transactionReference: cleanRef,
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
