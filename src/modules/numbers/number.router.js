const express = require('express');
const router = express.Router();
const numberController = require('./number.controller');
const paymentController = require('../payments/payment.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const upload = require('../../middlewares/upload.middleware');

// Reservation actions on numbers
router.post('/reserve', (req, res, next) => numberController.reserve(req, res, next));
router.get('/me', authenticate, (req, res, next) => numberController.getMine(req, res, next));
router.get('/user/:userId', (req, res, next) => numberController.getByUser(req, res, next));
router.get('/game/:gameId/confirmed', (req, res, next) => numberController.getConfirmedByGame(req, res, next));
router.get('/game/:gameId/active', (req, res, next) => numberController.getReservedByGame(req, res, next));
router.get('/active/all', (req, res, next) => numberController.getAllActive(req, res, next));

// Status transitions on a number (authenticate so req.user carries the admin's id)
router.patch('/:id/confirm', authenticate, (req, res, next) => numberController.confirm(req, res, next));
router.patch('/:id/cancel', authenticate, (req, res, next) => numberController.cancel(req, res, next));
router.post('/:id/restore', authenticate, (req, res, next) => numberController.restore(req, res, next));

// Multipart payment proof upload for a number: /api/numbers/:numberId/payment-proofs
router.post('/:numberId/payment-proofs', upload.single('proof'), (req, res, next) => paymentController.uploadProof(req, res, next));

// Board query routes (placed after specific sub-paths so :gameId doesn't shadow /me or /user)
router.get('/:gameId/summary', (req, res, next) => numberController.getSummary(req, res, next));
router.get('/:gameId', (req, res, next) => numberController.getByGame(req, res, next));

module.exports = router;
