const { Op } = require('sequelize');
const GameNumber = require('./number.model');
const Game = require('../games/game.model');
const User = require('../users/user.model');
const { sequelize } = require('../../config/database');

function formatNumberItem(item, gameTitle = null) {
  const resolvedGameTitle = gameTitle || (item.game ? item.game.title : `Game #${item.gameId}`);
  return {
    id: item.id,
    numberId: item.id,
    number: item.number,
    gameId: item.gameId,
    status: item.status,
    // Player who holds this number
    userId: item.userId,
    // Admin who seeded/created this number for the game
    createdById: item.createdById || null,
    // Admin who last confirmed or rejected this number
    confirmedById: item.confirmedById || null,
    expiresAt: item.expiresAt ? item.expiresAt.toISOString() : null,
    createdAt: item.createdAt ? item.createdAt.toISOString() : new Date().toISOString(),
    updatedAt: item.updatedAt ? item.updatedAt.toISOString() : new Date().toISOString(),
    gameTitle: resolvedGameTitle,
    user: item.user ? {
      id: item.user.id,
      name: `${item.user.firstName || ''} ${item.user.lastName || ''}`.trim(),
      phoneNumber: item.user.phoneNumber,
    } : null,
  };
}

class NumberService {
  async getByGame(gameId) {
    const list = await GameNumber.findAll({
      where: { gameId: Number(gameId) },
      include: [
        { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'phoneNumber'] },
        { model: Game, as: 'game', attributes: ['id', 'title'] },
      ],
      order: [['number', 'ASC']],
    });
    return list.map((item) => formatNumberItem(item));
  }

  async getSummary(gameId) {
    const numbers = await GameNumber.findAll({
      where: { gameId: Number(gameId) },
    });

    const available = numbers.filter((n) => n.status === 'AVAILABLE').length;
    const reserved = numbers.filter((n) => n.status === 'RESERVED').length;
    const confirmed = numbers.filter((n) => n.status === 'CONFIRMED').length;

    return {
      total: numbers.length,
      available,
      reserved,
      confirmed,
    };
  }

  async seedNumbersForGame(gameId, totalNumbers, transaction = null, createdById = null) {
    const count = await GameNumber.count({ where: { gameId }, transaction });
    if (count > 0) return;

    const list = [];
    for (let i = 1; i <= totalNumbers; i++) {
      list.push({
        gameId,
        number: i,
        status: 'AVAILABLE',
        userId: null,
        createdById: createdById || null,
        confirmedById: null,
        expiresAt: null,
      });
    }
    await GameNumber.bulkCreate(list, { transaction });
  }

  async reserve({ userId, numberId, gameId, minutes }) {
    const t = await sequelize.transaction();
    try {
      const holdMinutes = Number(minutes) || 5;

      const game = await Game.findByPk(gameId, { transaction: t });
      if (!game) {
        const error = new Error('Game not found');
        error.status = 404;
        throw error;
      }

      const gameNumber = await GameNumber.findOne({
        where: { id: numberId, gameId },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!gameNumber) {
        const error = new Error('Bingo number not found in this game');
        error.status = 404;
        throw error;
      }

      if (gameNumber.status !== 'AVAILABLE') {
        const error = new Error(`Number #${gameNumber.number} is no longer available (${gameNumber.status})`);
        error.status = 409;
        throw error;
      }

      const expiresAt = new Date(Date.now() + holdMinutes * 60 * 1000);

      gameNumber.status = 'RESERVED';
      gameNumber.userId = Number(userId);
      gameNumber.expiresAt = expiresAt;
      await gameNumber.save({ transaction: t });

      await t.commit();

      return formatNumberItem(gameNumber, game.title);
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  async getByUser(userId) {
    const list = await GameNumber.findAll({
      where: {
        userId: Number(userId),
        status: { [Op.ne]: 'AVAILABLE' },
      },
      include: [
        { model: Game, as: 'game', attributes: ['id', 'title'] },
        { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'phoneNumber'] },
      ],
      order: [['updatedAt', 'DESC']],
    });

    return list.map((item) => formatNumberItem(item));
  }

  async getConfirmedByGame(gameId) {
    const list = await GameNumber.findAll({
      where: {
        gameId: Number(gameId),
        status: 'CONFIRMED',
      },
      include: [
        { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'phoneNumber'] },
        { model: Game, as: 'game', attributes: ['id', 'title'] },
      ],
      order: [['number', 'ASC']],
    });

    return list.map((item) => formatNumberItem(item));
  }

  async getReservedByGame(gameId) {
    const list = await GameNumber.findAll({
      where: {
        gameId: Number(gameId),
        userId: { [Op.ne]: null },
      },
      include: [
        { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'phoneNumber'] },
        { model: Game, as: 'game', attributes: ['id', 'title'] },
      ],
      order: [['number', 'ASC']],
    });

    return list.map((item) => formatNumberItem(item));
  }

  async getAllActive() {
    const list = await GameNumber.findAll({
      where: {
        userId: { [Op.ne]: null },
      },
      include: [
        { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'phoneNumber'] },
        { model: Game, as: 'game', attributes: ['id', 'title'] },
      ],
      order: [['updatedAt', 'DESC']],
    });

    return list.map((item) => formatNumberItem(item));
  }

  async confirm(id, adminId = null) {
    const gameNumber = await GameNumber.findByPk(id, {
      include: [
        { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'phoneNumber'] },
        { model: Game, as: 'game', attributes: ['id', 'title'] },
      ],
    });

    if (!gameNumber) {
      const error = new Error('Number not found');
      error.status = 404;
      throw error;
    }

    gameNumber.status = 'CONFIRMED';
    gameNumber.confirmedById = adminId || gameNumber.confirmedById;
    await gameNumber.save();

    return formatNumberItem(gameNumber);
  }

  async cancel(id, adminId = null) {
    const gameNumber = await GameNumber.findByPk(id, {
      include: [
        { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'phoneNumber'] },
        { model: Game, as: 'game', attributes: ['id', 'title'] },
      ],
    });

    if (!gameNumber) {
      const error = new Error('Number not found');
      error.status = 404;
      throw error;
    }

    gameNumber.status = 'AVAILABLE';
    gameNumber.userId = null;
    gameNumber.expiresAt = null;
    // Record which admin released the number (if admin-initiated)
    if (adminId) gameNumber.confirmedById = adminId;
    await gameNumber.save();

    // Build response AFTER save so confirmedById is included
    return formatNumberItem(gameNumber);
  }

  async restore(id) {
    const gameNumber = await GameNumber.findByPk(id, {
      include: [
        { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'phoneNumber'] },
        { model: Game, as: 'game', attributes: ['id', 'title'] },
      ],
    });

    if (!gameNumber) {
      const error = new Error('Number not found');
      error.status = 404;
      throw error;
    }

    gameNumber.status = 'RESERVED';
    gameNumber.expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await gameNumber.save();

    return formatNumberItem(gameNumber);
  }
}

module.exports = new NumberService();
