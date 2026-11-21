const express = require('express');
const router = express.Router();
const paymentController = require('./payment.controller');
const { authenticate, optionalAuthenticate, requireRole } = require('../../middlewares/auth.middleware');
const upload = require('../../middlewares/upload.middleware');

router.get('/', (req, res, next) => paymentController.getAll(req, res, next));
router.get('/check-reference', optionalAuthenticate, (req, res, next) => paymentController.checkReference(req, res, next));
router.get('/reservations/:id', (req, res, next) => paymentController.getByReservation(req, res, next));
router.post('/proofs', upload.single('proof'), (req, res, next) => paymentController.uploadProof(req, res, next));
router.patch('/:id/verify', authenticate, requireRole('ADMIN'), (req, res, next) => paymentController.verify(req, res, next));
router.patch('/:id/reject', authenticate, requireRole('ADMIN'), (req, res, next) => paymentController.reject(req, res, next));
router.post('/:id/mistake-reports', authenticate, (req, res, next) => paymentController.reportMistake(req, res, next));
router.post(
  '/',
  authenticate,
  upload.single('proof'),
  (req, res, next) => paymentController.submitPayment(req, res, next)
);
module.exports = router;

