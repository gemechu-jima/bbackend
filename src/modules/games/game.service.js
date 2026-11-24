const Game = require('./game.model');
const GameNumber = require('../numbers/number.model');
const Draw = require('../draws/draw.model');
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
        title: data.title || 'Lucky Game',
        totalNumbers: count,
        reservationMinutes: Number(data.reservationMinutes) || 10,
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

  async drawing(id) {
    const game = await this.getById(id);
    game.status = 'DRAWING';
    await game.save();
    return game;
  }
  async pending(id) {
    const game = await this.getById(id);
    game.status = 'PENDING';
    await game.save();
    return game;
  }

  async delete(id) {
    const game = await this.getById(id);
    await game.destroy();
    return { message: 'Game deleted successfully' };
  }
  // Add these two methods inside your GameService class:
async updateGame(gameId, payload) {
  const game = await Game.findByPk(gameId);
  if (!game) {
    const err = new Error('Game not found.');
    err.status = 404;
    throw err;
  }

  const updates = {};
  if (payload.title !== undefined && String(payload.title).trim()) {
    updates.title = String(payload.title).trim();
  }
  if (payload.numberPrice !== undefined && Number(payload.numberPrice) > 0) {
    updates.numberPrice = Number(payload.numberPrice);
  }
  if (payload.reservationMinutes !== undefined && Number(payload.reservationMinutes) >= 1) {
    updates.reservationMinutes = Math.round(Number(payload.reservationMinutes));
  }
  if (payload.status !== undefined) {
    updates.status = payload.status;
  }
  if (payload.prizeDistribution !== undefined) {
    updates.prizeDistribution = payload.prizeDistribution;
  }

  await game.update(updates);
  await game.reload();
  return game;
}

async deleteGame(gameId) {
  const numericId = Number(gameId);
  const t = await sequelize.transaction();

  try {
    const game = await Game.findByPk(numericId, { transaction: t });
    if (!game) {
      const err = new Error('Game not found.');
      err.status = 404;
      throw err;
    }

    // Prevent accidental deletion if players already confirmed payments unless forced
    const confirmedCount = await GameNumber.count({
      where: { gameId: numericId, status: 'CONFIRMED' },
      transaction: t,
    });

    if (confirmedCount > 0 && game.status === 'ACTIVE') {
      const err = new Error(
        `Cannot delete an ACTIVE game with ${confirmedCount} confirmed number(s). Cancel or complete it first.`
      );
      err.status = 400;
      throw err;
    }

    // Clean up child numbers and draw records before deleting the game
    await Draw.destroy({ where: { gameId: numericId }, transaction: t });
    await GameNumber.destroy({ where: { gameId: numericId }, transaction: t });
    await game.destroy({ transaction: t });

    await t.commit();
    return true;
  } catch (err) {
    if (!t.finished) await t.rollback();
    throw err;
  }
}
}

module.exports = new GameService();

