const express = require('express');
const router = express.Router();
const userController = require('./user.controller');
const { authenticate, requireRole } = require('../../middlewares/auth.middleware');

router.post('/login', (req, res, next) => userController.login(req, res, next));
router.post('/register', (req, res, next) => userController.register(req, res, next));
router.get('/me', authenticate, (req, res, next) => userController.getMe(req, res, next));
router.get('/', authenticate, requireRole('ADMIN'), (req, res, next) => userController.getAll(req, res, next));

module.exports = router;

