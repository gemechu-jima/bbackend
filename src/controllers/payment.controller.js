const paymentService = require('../modules/payments/payment.service');

exports.uploadProof = async (req, res) => {
  try {
    const reservationId = Number(req.params.reservationId || req.body.reservationId || req.body.numberId);
    if (!reservationId) {
      return res.status(400).json({ message: 'Reservation or Number ID is required' });
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
    console.error('Upload proof error:', err);
    return res.status(err.status || 500).json({ message: err.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    const proofs = await paymentService.getAll();
    return res.json(proofs);
  } catch (err) {
    return res.status(err.status || 500).json({ message: err.message });
  }
};

exports.getByReservation = async (req, res) => {
  try {
    const proofs = await paymentService.getByReservation(req.params.id);
    return res.json(proofs);
  } catch (err) {
    return res.status(err.status || 500).json({ message: err.message });
  }
};

exports.verify = async (req, res) => {
  try {
    const reviewerId = req.user ? req.user.id : 1;
    const proof = await paymentService.verify(req.params.id, reviewerId);
    return res.json(proof);
  } catch (err) {
    return res.status(err.status || 500).json({ message: err.message });
  }
};

exports.reject = async (req, res) => {
  try {
    const reviewerId = req.user ? req.user.id : 1;
    const { note } = req.body;
    const proof = await paymentService.reject(req.params.id, note, reviewerId);
    return res.json(proof);
  } catch (err) {
    return res.status(err.status || 500).json({ message: err.message });
  }
};

exports.reportMistake = async (req, res) => {
  try {
    const actorId = req.user ? req.user.id : null;
    const { reason } = req.body;
    const audit = await paymentService.reportMistake(req.params.id, reason, actorId);
    return res.status(201).json({ message: 'Mistake report recorded in audit log', audit });
  } catch (err) {
    return res.status(err.status || 500).json({ message: err.message });
  }
};
