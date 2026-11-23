const express = require('express');
const router = express.Router();
const notificationController = require('./notification.controller');
const { authenticate, requireRole } = require('../../middlewares/auth.middleware');

router.get('/me', authenticate, (req, res, next) => notificationController.getMine(req, res, next));
router.get('/unread-count', authenticate, (req, res, next) => notificationController.getUnreadCount(req, res, next));
router.patch('/read-all', authenticate, (req, res, next) => notificationController.markAllRead(req, res, next));
router.patch('/:id/read', authenticate, (req, res, next) => notificationController.markRead(req, res, next));
router.get('/templates', authenticate, (req, res, next) => notificationController.getTemplates(req, res, next));
router.post('/announcements', authenticate, requireRole('ADMIN'), (req, res, next) => notificationController.sendAnnouncement(req, res, next));

module.exports = router;
