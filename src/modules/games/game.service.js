const Game = require('./game.model');
const numberService = require('../numbers/number.service');
const { sequelize } = require('../../config/database');

class GameService {
  async getAll() {
    return await Game.findAll({
      order: [['createdAt', 'DESC']],
    });
  }

  async getById(id) {
    const game = await Game.findByPk(id);
    if (!game) {
      const error = new Error('Game not found');
      error.status = 404;
      throw error;
    }
    return game;
  }

  async create(data, creatorId) {
    const t = await sequelize.transaction();
    try {
      const count = Number(data.totalNumbers) || 50;

      const game = await Game.create({
        title: data.title || 'Bingo Game',
        totalNumbers: count,
        reservationMinutes: Number(data.reservationMinutes) || 5,
        numberPrice: Number(data.numberPrice) || 100.0,
        prizeDistribution: data.prizeDistribution || { first: 60, second: 20, third: 10, fourth: 0, system: 10 },
        createdBy: creatorId || 1,
        status: 'PENDING',
      }, { transaction: t });

      // Automatically pre-seed all numbers 1..totalNumbers, track who created them
      await numberService.seedNumbersForGame(game.id, count, t, creatorId || null);

      await t.commit();
      return game;
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  async activate(id) {
    const game = await this.getById(id);
    // Re-seed numbers if needed; createdById is unknown at activation time
    await numberService.seedNumbersForGame(game.id, game.totalNumbers, null, null);
    game.status = 'ACTIVE';
    await game.save();
    return game;
  }

  async close(id) {
    const game = await this.getById(id);
    game.status = 'COMPLETED';
    await game.save();
    return game;
  }

  async cancel(id) {
    const game = await this.getById(id);
    game.status = 'CANCELLED';
    await game.save();
    return game;
  }

  async delete(id) {
    const game = await this.getById(id);
    await game.destroy();
    return { message: 'Game deleted successfully' };
  }
}

module.exports = new GameService();

