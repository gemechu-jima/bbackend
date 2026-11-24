const express = require('express');
const router = express.Router();
const userController = require('./user.controller');
const { authenticate, requireRole } = require('../../middlewares/auth.middleware');

router.post('/login', (req, res, next) => userController.login(req, res, next));
router.post('/register', (req, res, next) => userController.register(req, res, next));
router.post('/register-sms', (req, res, next) => userController.registerAndSendCode(req, res, next));
router.get('/me', authenticate, (req, res, next) => userController.getMe(req, res, next));
router.patch('/me', authenticate, (req, res, next) => userController.updateMe(req, res, next));
router.get('/', authenticate, requireRole('ADMIN'), (req, res, next) => userController.getAll(req, res, next));
router.patch('/:id/activation', authenticate, requireRole('ADMIN'), (req, res, next) =>
  userController.updateActivation(req, res, next)
);
router.patch('/:id', authenticate, requireRole('ADMIN'), (req, res, next) =>
  userController.updateUserByAdmin(req, res, next)
);
router.delete('/:id', authenticate, requireRole('ADMIN'), (req, res, next) =>
  userController.deleteUser(req, res, next)
);
router.patch('/:id/toggle-activation', authenticate, requireRole('ADMIN'), (req, res, next) =>
  userController.toggleActivation(req, res, next)
);
module.exports = router;

