const express = require('express');
const router = express.Router();
const drawController = require('../controllers/draw.controller');

// Matches /api/draws/game/:gameId/draw-now and /api/draws/game/:gameId/results
router.post('/game/:gameId/draw-now', drawController.drawNow);
router.get('/game/:gameId/results', drawController.getResults);
router.delete('/game/:gameId', drawController.resetGame);

module.exports = router;

