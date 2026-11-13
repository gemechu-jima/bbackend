const express = require('express');
const router = express.Router();
const gameController = require('./game.controller');
const { authenticate, requireRole } = require('../../middlewares/auth.middleware');

router.get('/', (req, res, next) => gameController.getAll(req, res, next));
router.get('/:id', (req, res, next) => gameController.getById(req, res, next));
router.post('/', authenticate, requireRole('ADMIN'), (req, res, next) => gameController.create(req, res, next));
router.patch('/:id/active', authenticate, requireRole('ADMIN'), (req, res, next) => gameController.activate(req, res, next));
router.patch('/:id/close', authenticate, requireRole('ADMIN'), (req, res, next) => gameController.close(req, res, next));
router.patch('/:id/cancel', authenticate, requireRole('ADMIN'), (req, res, next) => gameController.cancel(req, res, next));
router.delete('/:id', authenticate, requireRole('ADMIN'), (req, res, next) => gameController.delete(req, res, next));

module.exports = router;

