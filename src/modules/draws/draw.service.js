const Draw = require('./draw.model');
const Game = require('../games/game.model');
const User = require('../users/user.model');
const GameNumber = require('../numbers/number.model');
const { sequelize } = require('../../config/database');

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

class DrawService {
  async drawNow(gameId, adminId = 1) {
    const t = await sequelize.transaction();
    try {
      const game = await Game.findByPk(gameId, { transaction: t });
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

      // Check if official draw already exists
      const existingDraw = await Draw.findOne({ where: { gameId }, transaction: t });
      if (existingDraw) {
        const error = new Error('This game has already been drawn. Official results are already saved.');
        error.status = 409;
        throw error;
      }

      // Fetch ONLY confirmed numbers
      const confirmedNumbers = await GameNumber.findAll({
        where: { gameId, status: 'CONFIRMED' },
        include: [
          { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'phoneNumber'] },
        ],
        transaction: t,
      });

      if (confirmedNumbers.length === 0) {
        const error = new Error('Cannot draw: there are no eligible confirmed numbers for this game.');
        error.status = 400;
        throw error;
      }

      // Calculate total pool based on confirmed tickets * price
      const ticketPrice = Number(game.numberPrice) || 100;
      const totalPrizePool = confirmedNumbers.length * ticketPrice;

      const shares = game.prizeDistribution || { first: 60, second: 20, third: 10, fourth: 0, system: 10 };
      const prizePercentages = [shares.first || 60, shares.second || 20, shares.third || 10];

      // Shuffle and pick winners
      const shuffled = shuffle(confirmedNumbers);
      const winnersCount = Math.min(shuffled.length, prizePercentages.length);
      const winners = [];

      for (let place = 1; place <= winnersCount; place++) {
        const winnerNum = shuffled[place - 1];
        const pct = prizePercentages[place - 1] / 100;
        const prizeAmount = Math.round(totalPrizePool * pct);

        const displayName = winnerNum.user
          ? `${winnerNum.user.firstName || ''} ${winnerNum.user.lastName ? winnerNum.user.lastName.charAt(0) + '.' : ''}`.trim()
          : `Player #${winnerNum.userId}`;

        winners.push({
          place,
          reservationId: winnerNum.id, // For mobile app compatibility
          numberId: winnerNum.id,
          number: winnerNum.number,
          displayName,
          prizeAmount,
        });
      }

      const draw = await Draw.create({
        gameId,
        status: 'COMPLETED',
        winners,
        drawnBy: adminId,
      }, { transaction: t });

      // Mark game as COMPLETED
      game.status = 'COMPLETED';
      await game.save({ transaction: t });

      await t.commit();

      return {
        id: draw.id,
        gameId: draw.gameId,
        status: draw.status,
        winners: draw.winners,
        createdAt: draw.createdAt.toISOString(),
      };
    } catch (err) {
      await t.rollback();
      throw err;
    }
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

  async resetGame(gameId) {
    await Draw.destroy({ where: { gameId: Number(gameId) } });
    await Game.update({ status: 'ACTIVE' }, { where: { id: Number(gameId) } });
    return { message: 'Game draw reset successfully.' };
  }
}

module.exports = new DrawService();
