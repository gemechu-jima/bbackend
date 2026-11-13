const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const upload = require('../middlewares/upload.middleware');

router.get('/', paymentController.getAll);
router.get('/reservations/:id', paymentController.getByReservation);
router.post('/proofs', upload.single('proof'), paymentController.uploadProof);
router.patch('/:id/verify', paymentController.verify);
router.patch('/:id/reject', paymentController.reject);
router.post('/:id/mistake-reports', paymentController.reportMistake);

module.exports = router;

