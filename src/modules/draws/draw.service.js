const crypto = require('crypto');
const Draw = require('./draw.model');
const Game = require('../games/game.model');
const User = require('../users/user.model');
const GameNumber = require('../numbers/number.model');
const { sequelize } = require('../../config/database');
// Add at the top of src/modules/draws/draw.service.js:
const Notification = require('../notifications/notification.model');
// Cryptographically secure Fisher-Yates shuffle
function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

class DrawService {
  async drawNow(gameId, adminId = 1) {
    const numericGameId = Number(gameId);
    const t = await sequelize.transaction();

    let committedData;

    try {
      const game = await Game.findByPk(numericGameId, { transaction: t });
      if (!game) {
        const error = new Error('Game not found');
        error.status = 404;
        throw error;
      }

      if (game.status !== 'ACTIVE' && game.status !== 'DRAWING') {
        const error = new Error(`Game is currently ${game.status} and cannot be drawn.`);
        error.status = 400;
        throw error;
      }

      const existingDraw = await Draw.findOne({
        where: { gameId: numericGameId },
        transaction: t,
      });
      if (existingDraw) {
        const error = new Error('This game has already been drawn. Official results are already saved.');
        error.status = 409;
        throw error;
      }

      const totalCount = await GameNumber.count({
        where: { gameId: numericGameId },
        transaction: t,
      });

      const confirmedNumbers = await GameNumber.findAll({
        where: { gameId: numericGameId, status: 'CONFIRMED' },
        include: [
          { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'phoneNumber'] },
        ],
        transaction: t,
      });

      if (confirmedNumbers.length === 0) {
        const error = new Error('Cannot draw: there are no confirmed numbers for this game.');
        error.status = 400;
        throw error;
      }

      // If you strictly require ALL numbers to be sold before drawing, keep this check with a clear message:
      if (totalCount > 0 && confirmedNumbers.length !== totalCount) {
        const error = new Error(
          `Cannot draw yet: only ${confirmedNumbers.length} of ${totalCount} numbers are confirmed.`
        );
        error.status = 400;
        throw error;
      }

      const ticketPrice = Number(game.numberPrice);
      const totalPrizePool = confirmedNumbers.length * ticketPrice;

      const rawShares =
        typeof game.prizeDistribution === 'string'
          ? JSON.parse(game.prizeDistribution)
          : game.prizeDistribution || { first: 60, second: 20, third: 10, fourth: 0, system: 10 };

      const prizeTiers = [];
      if (Number(rawShares.first) > 0) prizeTiers.push({ place: 1, name: '1st Place', pct: Number(rawShares.first) });
      if (Number(rawShares.second) > 0) prizeTiers.push({ place: 2, name: '2nd Place', pct: Number(rawShares.second) });
      if (Number(rawShares.third) > 0) prizeTiers.push({ place: 3, name: '3rd Place', pct: Number(rawShares.third) });
      if (Number(rawShares.fourth) > 0) prizeTiers.push({ place: 4, name: '4th Place', pct: Number(rawShares.fourth) });

      if (prizeTiers.length === 0) {
        prizeTiers.push(
          { place: 1, name: '1st Place', pct: 60 },
          { place: 2, name: '2nd Place', pct: 20 },
          { place: 3, name: '3rd Place', pct: 10 }
        );
      }

      const shuffled = shuffle(confirmedNumbers);
      const winnersCount = Math.min(shuffled.length, prizeTiers.length);
      const winners = [];

      for (let i = 0; i < winnersCount; i++) {
        const tier = prizeTiers[i];
        const winnerNum = shuffled[i];
        const prizeAmount = Math.round(totalPrizePool * (tier.pct / 100));

        const displayName = winnerNum.user
          ? `${winnerNum.user.firstName || ''} ${winnerNum.user.lastName ? winnerNum.user.lastName.charAt(0) + '.' : ''}`.trim()
          : `Player #${winnerNum.userId}`;

        winners.push({
          place: tier.place,
          tierName: tier.name,
          pct: tier.pct,
          reservationId: winnerNum.id,
          numberId: winnerNum.id,
          number: winnerNum.number,
          userId: winnerNum.userId,
          displayName,
          prizeAmount,
        });
      }

      const draw = await Draw.create(
        {
          gameId: numericGameId,
          status: 'COMPLETED',
          winners,
          drawnBy: adminId,
        },
        { transaction: t }
      );

      game.status = 'COMPLETED';
      await game.save({ transaction: t });

      await t.commit();

      committedData = {
        id: draw.id,
        gameId: draw.gameId,
        gameTitle: game.title,
        status: draw.status,
        winners,
        createdAt: draw.createdAt ? new Date(draw.createdAt).toISOString() : new Date().toISOString(),
      };
    } catch (err) {
      if (!t.finished) {
        await t.rollback();
      }
      throw err;
    }

    // Post-commit notifications (never triggers transaction rollback)
    try {
      const notificationService = require('../notifications/notification.service');
      for (const w of committedData.winners) {
        if (w.userId) {
          await notificationService.createNotification({
            userId: w.userId,
            title: `🎉 Congratulations! You Won ${w.tierName || `#${w.place}`}!`,
            message: `Your lucky number #${w.number} won ${w.tierName || `#${w.place}`} in "${committedData.gameTitle}"! Prize: ${w.prizeAmount} ETB (${w.pct}% of pool).`,
            type: 'WIN',
            metadata: {
              drawId: committedData.id,
              gameId: committedData.gameId,
              number: w.number,
              place: w.place,
              prizeAmount: w.prizeAmount,
            },
          });
        }
      }
    } catch (notifErr) {
      console.error('Error sending win notifications:', notifErr.message);
    }

    return {
      id: committedData.id,
      gameId: committedData.gameId,
      status: committedData.status,
      winners: committedData.winners,
      createdAt: committedData.createdAt,
    };
  }

  async getResults(gameId) {
    const results = await Draw.findAll({
      where: { gameId: Number(gameId) },
      order: [['createdAt', 'DESC']],
    });

    return results.map((r) => ({
      id: r.id,
      gameId: r.gameId,
      status: r.status,
      winners: r.winners,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async getDrawHistory() {
    const results = await Draw.findAll({
      include: [
        {
          model: Game,
          as: 'game',
          attributes: ['id', 'title', 'totalNumbers', 'numberPrice', 'prizeDistribution', 'status'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    return results.map((r) => {
      const winners = r.winners || [];
      const totalPrize = winners.reduce((sum, w) => sum + (Number(w.prizeAmount) || 0), 0);
      return {
        id: r.id,
        gameId: r.gameId,
        gameTitle: r.game ? r.game.title : `Game #${r.gameId}`,
        gameTotalNumbers: r.game ? r.game.totalNumbers : null,
        numberPrice: r.game ? r.game.numberPrice : null,
        status: r.status,
        winners,
        totalPrize,
        createdAt: r.createdAt.toISOString(),
      };
    });
  }

  async resetGame(gameId) {
    const numericGameId = Number(gameId);
    const t = await sequelize.transaction();

    try {
      // 1. Find WIN notifications for this game and delete them
      const winNotifications = await Notification.findAll({
        where: { type: 'WIN' },
        transaction: t,
      });

      const idsToDelete = winNotifications
        .filter((n) => {
          const meta =
            typeof n.metadata === 'string' ? JSON.parse(n.metadata) : n.metadata;
          return Number(meta?.gameId) === numericGameId;
        })
        .map((n) => n.id);

      if (idsToDelete.length > 0) {
        await Notification.destroy({
          where: { id: idsToDelete },
          transaction: t,
        });
      }

      // 2. Delete the draw record and reopen the game
      await Draw.destroy({
        where: { gameId: numericGameId },
        transaction: t,
      });

      await Game.update(
        { status: 'ACTIVE' },
        { where: { id: numericGameId }, transaction: t }
      );

      await t.commit();
      return {
        message: 'Game draw and win notifications reset successfully.',
        deletedNotifications: idsToDelete.length,
      };
    } catch (err) {
      if (!t.finished) await t.rollback();
      throw err;
    }
  }
}

module.exports = new DrawService();
