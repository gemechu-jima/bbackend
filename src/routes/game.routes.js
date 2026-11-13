const express = require('express');
const router = express.Router();
const gameController = require('../controllers/game.controller');

router.get('/', gameController.getAll);
router.get('/:id', gameController.getById);
router.post('/', gameController.create);
router.patch('/:id/active', gameController.activate);
router.patch('/:id/close', gameController.close);
router.patch('/:id/cancel', gameController.cancel);
router.delete('/:id', gameController.deleteGame);

module.exports = router;

