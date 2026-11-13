const drawService = require('./draw.service');

class DrawController {
  async drawNow(req, res, next) {
    try {
      const adminId = req.user ? req.user.id : 1;
      const result = await drawService.drawNow(req.params.gameId, adminId);
      return res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  async getResults(req, res, next) {
    try {
      const results = await drawService.getResults(req.params.gameId);
      return res.json(results);
    } catch (err) {
      next(err);
    }
  }

  async resetGame(req, res, next) {
    try {
      const result = await drawService.resetGame(req.params.gameId);
      return res.json(result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new DrawController();

