const express = require('express');
const router = express.Router();
const drawController = require('./draw.controller');
const { authenticate, requireRole } = require('../../middlewares/auth.middleware');

router.get('/history', (req, res, next) => drawController.getDrawHistory(req, res, next));
router.get('/', (req, res, next) => drawController.getDrawHistory(req, res, next));
router.post('/game/:gameId/draw-now', authenticate, requireRole('ADMIN'), (req, res, next) => drawController.drawNow(req, res, next));
router.get('/game/:gameId/results', (req, res, next) => drawController.getResults(req, res, next));
router.delete('/game/:gameId', authenticate, requireRole('ADMIN'), (req, res, next) => drawController.resetGame(req, res, next));

module.exports = router;

