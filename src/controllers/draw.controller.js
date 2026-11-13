const drawService = require('../modules/draws/draw.service');

exports.drawNow = async (req, res) => {
  try {
    const gameId = Number(req.params.gameId);
    const adminId = req.user ? req.user.id : 1;
    const result = await drawService.drawNow(gameId, adminId);
    return res.status(201).json(result);
  } catch (err) {
    console.error('Draw execution failed:', err);
    return res.status(err.status || 500).json({ message: err.message });
  }
};

exports.getResults = async (req, res) => {
  try {
    const gameId = Number(req.params.gameId);
    const results = await drawService.getResults(gameId);
    return res.json(results);
  } catch (err) {
    return res.status(err.status || 500).json({ message: err.message });
  }
};

exports.resetGame = async (req, res) => {
  try {
    const gameId = Number(req.params.gameId);
    const result = await drawService.resetGame(gameId);
    return res.json(result);
  } catch (err) {
    return res.status(err.status || 500).json({ message: err.message });
  }
};
