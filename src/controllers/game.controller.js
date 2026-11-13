const { Game, GameNumber, Reservation, sequelize } = require('../models');

// Helper to seed numbers for a game (1..totalNumbers)
async function seedGameNumbers(gameId, totalNumbers, transaction) {
  const existingCount = await GameNumber.count({ where: { gameId }, transaction });
  if (existingCount > 0) return;

  const numbersToInsert = [];
  for (let i = 1; i <= totalNumbers; i++) {
    numbersToInsert.push({
      gameId,
      number: i,
      status: 'AVAILABLE',
    });
  }
  await GameNumber.bulkCreate(numbersToInsert, { transaction });
}

exports.getAll = async (req, res) => {
  try {
    const games = await Game.findAll({
      order: [['createdAt', 'DESC']],
    });
    return res.json(games);
  } catch (err) {
    console.error('Fetch games error:', err);
    return res.status(500).json({ message: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const game = await Game.findByPk(req.params.id);
    if (!game) return res.status(404).json({ message: 'Game not found' });
    return res.json(game);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.create = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { title, totalNumbers, reservationMinutes, numberPrice, prizeDistribution } = req.body;
    const createdBy = req.user ? req.user.id : (req.body.createdBy || 1);

    const count = Number(totalNumbers) || 50;

    const game = await Game.create({
      title: title || 'Bingo Game',
      totalNumbers: count,
      reservationMinutes: Number(reservationMinutes) || 5,
      numberPrice: Number(numberPrice) || 100.0,
      prizeDistribution: prizeDistribution || { first: 60, second: 20, third: 10, fourth: 0, system: 10 },
      createdBy,
      status: 'PENDING',
    }, { transaction: t });

    // Seed the numbers 1..N
    await seedGameNumbers(game.id, count, t);

    await t.commit();
    return res.status(201).json(game);
  } catch (err) {
    await t.rollback();
    console.error('Create game error:', err);
    return res.status(500).json({ message: err.message });
  }
};

exports.activate = async (req, res) => {
  try {
    const game = await Game.findByPk(req.params.id);
    if (!game) return res.status(404).json({ message: 'Game not found' });

    // Ensure numbers are generated
    await seedGameNumbers(game.id, game.totalNumbers);

    game.status = 'ACTIVE';
    await game.save();
    return res.json(game);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.close = async (req, res) => {
  try {
    const game = await Game.findByPk(req.params.id);
    if (!game) return res.status(404).json({ message: 'Game not found' });
    game.status = 'COMPLETED';
    await game.save();
    return res.json(game);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.cancel = async (req, res) => {
  try {
    const game = await Game.findByPk(req.params.id);
    if (!game) return res.status(404).json({ message: 'Game not found' });
    game.status = 'CANCELLED';
    await game.save();
    return res.json(game);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.deleteGame = async (req, res) => {
  try {
    const game = await Game.findByPk(req.params.id);
    if (!game) return res.status(404).json({ message: 'Game not found' });
    await game.destroy();
    return res.json({ message: 'Game deleted successfully' });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

