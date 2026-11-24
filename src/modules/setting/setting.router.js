const express = require('express');
const router = express.Router();
const settingController = require('./setting.controller');
const { authenticate, requireRole, optionalAuthenticate } = require('../../middlewares/auth.middleware');

router.get('/', optionalAuthenticate, (req, res, next) =>
  settingController.getSettings(req, res, next)
);

router.put('/', authenticate, requireRole('ADMIN'), (req, res, next) =>
  settingController.updateSettings(req, res, next)
);

router.patch('/', authenticate, requireRole('ADMIN'), (req, res, next) =>
  settingController.updateSettings(req, res, next)
);

module.exports = router;