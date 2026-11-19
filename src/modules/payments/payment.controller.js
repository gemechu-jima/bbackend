const paymentService = require('./payment.service');

class PaymentController {
  async checkReference(req, res, next) {
    try {
      const reference = req.query.reference || req.query.transactionReference || req.body.reference;
      const reservationId = req.query.reservationId || req.query.numberId;
      const gameId = req.query.gameId;
      const userId = req.user ? req.user.id : (req.query.userId || req.body.userId);

      const result = await paymentService.checkReference({
        reference,
        userId,
        gameId,
        reservationId,
        numberId: reservationId,
      });

      return res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async uploadProof(req, res, next) {
    try {
      const reservationId = Number(
        req.params.numberId ||
        req.params.reservationId ||
        req.body.numberId ||
        req.body.reservationId
      );
      if (!reservationId) {
        return res.status(400).json({ message: 'Reservation/number ID is required' });
      }

      const { provider, transactionReference, proofUrl } = req.body;
      const userId = req.user ? req.user.id : req.body.userId;

      const paymentProof = await paymentService.uploadProof({
        reservationId,
        numberId: reservationId,
        userId,
        provider,
        transactionReference,
        proofUrl,
        file: req.file,
      });

      return res.status(201).json({
        message: 'Payment proof submitted successfully for verification',
        paymentProof,
      });
    } catch (err) {
      next(err);
    }
  }

  async getAll(req, res, next) {
    try {
      const proofs = await paymentService.getAll();
      return res.json(proofs);
    } catch (err) {
      next(err);
    }
  }

  async getByReservation(req, res, next) {
    try {
      const proofs = await paymentService.getByReservation(req.params.id);
      return res.json(proofs);
    } catch (err) {
      next(err);
    }
  }

  async verify(req, res, next) {
    try {
      const reviewerId = req.user ? req.user.id : 1;
      const proof = await paymentService.verify(req.params.id, reviewerId);
      return res.json(proof);
    } catch (err) {
      next(err);
    }
  }

  async reject(req, res, next) {
    try {
      const reviewerId = req.user ? req.user.id : 1;
      const { note } = req.body;
      const proof = await paymentService.reject(req.params.id, note, reviewerId);
      return res.json(proof);
    } catch (err) {
      next(err);
    }
  }

  async reportMistake(req, res, next) {
    try {
      const actorId = req.user ? req.user.id : null;
      const { reason } = req.body;
      const audit = await paymentService.reportMistake(req.params.id, reason, actorId);
      return res.status(201).json({ message: 'Mistake report recorded in audit log', audit });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new PaymentController();

