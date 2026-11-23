const Notification = require('./notification.model');
const Draw = require('../draws/draw.model');
const Game = require('../games/game.model');
const User = require('../users/user.model');
const GameNumber = require('../numbers/number.model');
const { Op } = require('sequelize');

class NotificationService {
  async createNotification({ userId, title, message, type = 'SYSTEM', metadata = null }) {
    if (!userId || !title || !message) return null;
    return await Notification.create({
      userId: Number(userId),
      title,
      message,
      type,
      metadata,
      isRead: false,
    });
  }

  async getForUser(userId) {
    const uid = Number(userId);

    // Sync any winning draw results for this user that might not be in notifications yet
    try {
      await this.syncWinNotificationsForUser(uid);
    } catch (e) {
      console.error('Failed to sync win notifications:', e.message);
    }

    return await Notification.findAll({
      where: { userId: uid },
      order: [['createdAt', 'DESC']],
      limit: 50,
    });
  }

  async syncWinNotificationsForUser(userId) {
    // Find all completed draws
    const completedDraws = await Draw.findAll({
      where: { status: 'COMPLETED' },
      order: [['createdAt', 'DESC']],
      limit: 20,
    });

    for (const draw of completedDraws) {
      if (!Array.isArray(draw.winners)) continue;

      for (const winner of draw.winners) {
        let isUserWinner = false;

        // Check if winner has direct userId
        if (winner.userId && Number(winner.userId) === userId) {
          isUserWinner = true;
        } else if (winner.numberId || winner.reservationId) {
          // Check if this number belonged to user
          const numId = winner.numberId || winner.reservationId;
          const gNum = await GameNumber.findByPk(numId);
          if (gNum && Number(gNum.userId) === userId) {
            isUserWinner = true;
          }
        }

        if (isUserWinner) {
          // Check if notification already exists for this draw and place
          const existing = await Notification.findOne({
            where: {
              userId,
              type: 'WIN',
              metadata: {
                drawId: draw.id,
                place: winner.place,
              },
            },
          });

          if (!existing) {
            const game = await Game.findByPk(draw.gameId);
            const gameTitle = game ? game.title : `Game #${draw.gameId}`;
            const tierName = winner.tierName || (winner.place === 1 ? '1st Place' : `${winner.place}th Place`);

            await Notification.create({
              userId,
              title: `🎉 Congratulations! You Won ${tierName}!`,
              message: `Your lucky number #${winner.number} won ${tierName} in "${gameTitle}"! Prize: ${winner.prizeAmount} ETB.`,
              type: 'WIN',
              metadata: {
                drawId: draw.id,
                gameId: draw.gameId,
                number: winner.number,
                place: winner.place,
                prizeAmount: winner.prizeAmount,
              },
              isRead: false,
            });
          }
        }
      }
    }
  }

  async markRead(id, userId) {
    const notification = await Notification.findOne({
      where: { id: Number(id), userId: Number(userId) },
    });

    if (!notification) {
      const err = new Error('Notification not found');
      err.status = 404;
      throw err;
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();
    return notification;
  }

  async markAllRead(userId) {
    await Notification.update(
      { isRead: true, readAt: new Date() },
      { where: { userId: Number(userId), isRead: false } }
    );
    return { success: true };
  }

  async getUnreadCount(userId) {
    return await Notification.count({
      where: { userId: Number(userId), isRead: false },
    });
  }

  async sendAnnouncement({ title, message, audience = 'ALL', gameId = null }) {
    if (!title || !message) {
      const err = new Error('Title and message are required.');
      err.status = 400;
      throw err;
    }

    let targetUsers = [];
    if (audience === 'GAME' && gameId) {
      const numbers = await GameNumber.findAll({
        where: { gameId: Number(gameId), userId: { [Op.ne]: null } },
        attributes: ['userId'],
      });
      const userIds = [...new Set(numbers.map((n) => n.userId))];
      targetUsers = await User.findAll({ where: { id: { [Op.in]: userIds } } });
    } else {
      targetUsers = await User.findAll({ where: { role: 'PLAYER' } });
    }

    const notifications = targetUsers.map((u) => ({
      userId: u.id,
      title,
      message,
      type: 'ANNOUNCEMENT',
      metadata: gameId ? { gameId: Number(gameId) } : null,
      isRead: false,
    }));

    if (notifications.length > 0) {
      await Notification.bulkCreate(notifications);
    }

    return { sentCount: notifications.length };
  }
}

module.exports = new NotificationService();
