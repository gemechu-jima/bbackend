const notificationService = require('./notification.service');

class NotificationController {
  async getMine(req, res, next) {
    try {
      const notifications = await notificationService.getForUser(req.user.id);
      return res.json(notifications);
    } catch (err) {
      next(err);
    }
  }

  async getUnreadCount(req, res, next) {
    try {
      const count = await notificationService.getUnreadCount(req.user.id);
      return res.json({ unreadCount: count });
    } catch (err) {
      next(err);
    }
  }

  async markRead(req, res, next) {
    try {
      const updated = await notificationService.markRead(req.params.id, req.user.id);
      return res.json(updated);
    } catch (err) {
      if (err.status) {
        return res.status(err.status).json({ message: err.message });
      }
      next(err);
    }
  }

  async markAllRead(req, res, next) {
    try {
      const result = await notificationService.markAllRead(req.user.id);
      return res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async getTemplates(req, res, next) {
    try {
      const templates = [
        { id: 1, title: 'Game Starting Soon', message: 'The draw for {gameTitle} will begin in 10 minutes. Ensure your tickets are confirmed!' },
        { id: 2, title: 'New Game Available', message: 'A new Bingo game "{gameTitle}" is now open for number reservations. Pick your lucky numbers!' },
        { id: 3, title: 'Draw Results Announced', message: 'Official results for {gameTitle} have been published. Check if you are a winner!' },
      ];
      return res.json(templates);
    } catch (err) {
      next(err);
    }
  }

  async sendAnnouncement(req, res, next) {
    try {
      const { title, message, audience, gameId } = req.body;
      const result = await notificationService.sendAnnouncement({ title, message, audience, gameId });
      return res.status(201).json(result);
    } catch (err) {
      if (err.status) {
        return res.status(err.status).json({ message: err.message });
      }
      next(err);
    }
  }
}

module.exports = new NotificationController();
