const paymentService = require('./payment.service');

class PaymentController {
  async checkReference(req, res, next) {
    try {
      const reference = req.query.reference || req.query.transactionReference || req.body?.reference;
      const reservationId = req.query.reservationId || req.query.numberId;
      const gameId = req.query.gameId;
      const userId = req.user ? req.user.id : (req.query.userId || req.body?.userId);

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

      const { provider, paymentMethod, transactionReference, referenceNumber, proofUrl, amount } = req.body;
      const userId = req.user ? req.user.id : req.body.userId;

      const paymentProof = await paymentService.uploadProof({
        reservationId,
        numberId: reservationId,
        userId,
        provider: provider || paymentMethod,
        transactionReference: transactionReference || referenceNumber,
        proofUrl,
        file: req.file,
        amount,
      });

      return res.status(201).json({
        message: 'Payment proof submitted successfully for verification',
        paymentProof,
      });
    } catch (err) {
      if (err.status) {
        return res.status(err.status).json({ message: err.message });
      }
      next(err);
    }
  }

  async submitPayment(req, res, next) {
    try {
      const proofUrl =
        req.body.screenshotUrl ||
        req.body.proofUrl ||
        req.body.imageUrl ||
        (req.file ? `/uploads/${req.file.filename}` : null);

      const userId = req.user ? req.user.id : req.body.userId;

      const paymentProof = await paymentService.uploadProof({
        reservationId: req.body.reservationId || req.body.numberId,
        numberId: req.body.numberId || req.body.reservationId,
        userId,
        provider: req.body.provider || req.body.paymentMethod,
        transactionReference: req.body.transactionReference || req.body.referenceNumber,
        proofUrl,
        file: req.file,
        amount: req.body.amount,
      });

      return res.status(201).json({
        message: 'Payment proof submitted successfully for verification',
        paymentProof,
      });
    } catch (err) {
      if (err.status) {
        return res.status(err.status).json({ message: err.message });
      }
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

  async getAllPayments(req, res, next) {
    return this.getAll(req, res, next);
  }

  async getMyPayments(req, res, next) {
    try {
      const userId = req.user ? req.user.id : req.params.userId;
      const payments = await paymentService.getUserPayments(userId);
      return res.json(payments);
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
      if (err.status) {
        return res.status(err.status).json({ message: err.message });
      }
      next(err);
    }
  }

  async approvePayment(req, res, next) {
    return this.verify(req, res, next);
  }

  async reject(req, res, next) {
    try {
      const reviewerId = req.user ? req.user.id : 1;
      const { note, reason } = req.body;
      const proof = await paymentService.reject(req.params.id, note || reason, reviewerId);
      return res.json(proof);
    } catch (err) {
      if (err.status) {
        return res.status(err.status).json({ message: err.message });
      }
      next(err);
    }
  }

  async rejectPayment(req, res, next) {
    return this.reject(req, res, next);
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
