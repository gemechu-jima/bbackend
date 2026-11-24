const gameService = require('./game.service');

class GameController {
  async getAll(req, res, next) {
    try {
      const games = await gameService.getAll();
      return res.json(games);
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const game = await gameService.getById(req.params.id);
      return res.json(game);
    } catch (err) {
      next(err);
    }
  }

  async create(req, res, next) {
    try {
      const creatorId = req.user ? req.user.id : (req.body.createdBy || 1);
      const game = await gameService.create(req.body, creatorId);
      return res.status(201).json(game);
    } catch (err) {
      next(err);
    }
  }

  async activate(req, res, next) {
    try {
      const game = await gameService.activate(req.params.id);
      return res.json(game);
    } catch (err) {
      next(err);
    }
  }

  async close(req, res, next) {
    try {
      const game = await gameService.close(req.params.id);
      return res.json(game);
    } catch (err) {
      next(err);
    }
  }

  async cancel(req, res, next) {
    try {
      const game = await gameService.cancel(req.params.id);
      return res.json(game);
    } catch (err) {
      next(err);
    }
  }
  async pending(req, res, next) {
    try {
      const game = await gameService.pending(req.params.id);
      return res.json(game);
    } catch (err) {
      next(err);
    }
  }
  async drawing(req, res, next) {
    try {
      const game = await gameService.drawing(req.params.id);
      return res.json(game);
    } catch (err) {
      next(err);
    }
  }
  async delete(req, res, next) {
    try {
      const result = await gameService.delete(req.params.id);
      return res.json(result);
    } catch (err) {
      next(err);
    } 
  }
  async updateGame(req, res, next) {
  try {
    const updated = await gameService.updateGame(req.params.id, req.body);
    return res.status(200).json(updated);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    next(err);
  }
}

async deleteGame(req, res, next) {
  try {
    await gameService.deleteGame(req.params.id);
    return res.status(200).json({ success: true, message: 'Game deleted.' });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    next(err);
  }
}
}

module.exports = new GameController();

