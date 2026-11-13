const paymentService = require('./payment.service');

class PaymentController {
  async uploadProof(req, res, next) {
    try {
      const reservationId = Number(req.params.reservationId || req.body.reservationId);
      if (!reservationId) {
        return res.status(400).json({ message: 'Reservation ID is required' });
      }

      const { provider, transactionReference } = req.body;
      const userId = req.user ? req.user.id : (req.body.userId || 1);

      const paymentProof = await paymentService.uploadProof({
        reservationId,
        userId,
        provider,
        transactionReference,
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

