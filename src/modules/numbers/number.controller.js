const numberService = require('./number.service');

class NumberController {
  async getByGame(req, res, next) {
    try {
      const numbers = await numberService.getByGame(req.params.gameId);
      return res.json({
        data: numbers,
        status: 200,
        message: 'successfully',
      });
    } catch (err) {
      next(err);
    }
  }

  async getForGame(req, res, next) {
    try {
      const numbers = await numberService.getByGame(req.params.gameId);
      return res.json(numbers);
    } catch (err) {
      next(err);
    }
  }

  async getSummary(req, res, next) {
    try {
      const summary = await numberService.getSummary(req.params.gameId);
      return res.json(summary);
    } catch (err) {
      next(err);
    }
  }

  async reserve(req, res, next) {
    try {
      const userId = req.user ? req.user.id : req.body.userId;
      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      const { numberId, gameId, minutes } = req.body;
      const result = await numberService.reserve({
        userId,
        numberId: Number(numberId),
        gameId: Number(gameId),
        minutes: Number(minutes) || 5,
      });
      return res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  async getByUser(req, res, next) {
    try {
      const userId = req.params.userId || (req.user ? req.user.id : null);
      if (!userId) return res.status(400).json({ message: 'User ID is required' });
      const numbers = await numberService.getByUser(userId);
      return res.json(numbers);
    } catch (err) {
      next(err);
    }
  }

  async getMine(req, res, next) {
    try {
      const userId = req.user ? req.user.id : req.query.userId;
      if (!userId) return res.status(401).json({ message: 'Authentication required' });
      const numbers = await numberService.getByUser(userId);
      return res.json(numbers);
    } catch (err) {
      next(err);
    }
  }

  async getConfirmedByGame(req, res, next) {
    try {
      const numbers = await numberService.getConfirmedByGame(req.params.gameId);
      return res.json(numbers);
    } catch (err) {
      next(err);
    }
  }

  async getReservedByGame(req, res, next) {
    try {
      const numbers = await numberService.getReservedByGame(req.params.gameId);
      return res.json(numbers);
    } catch (err) {
      next(err);
    }
  }

  async getAllActive(req, res, next) {
    try {
      const numbers = await numberService.getAllActive();
      return res.json(numbers);
    } catch (err) {
      next(err);
    }
  }

  async confirm(req, res, next) {
    try {
      const adminId = req.user ? req.user.id : null;
      const result = await numberService.confirm(req.params.id, adminId);
      return res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async cancel(req, res, next) {
    try {
      const adminId = req.user ? req.user.id : null;
      const result = await numberService.cancel(req.params.id, adminId);
      return res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async restore(req, res, next) {
    try {
      const result = await numberService.restore(req.params.id);
      return res.json(result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new NumberController();
