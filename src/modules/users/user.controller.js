const userService = require('./user.service');

class UserController {
  async login(req, res, next) {
    try {
      const { phoneNumber } = req.body;
      console.log(req.body)
      if (!phoneNumber || !phoneNumber.trim()) {
        return res.status(400).json({ message: 'Phone number is required' });
      }
      const result = await userService.login(phoneNumber);
      return res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async register(req, res, next) {
    try {
      const { firstName, lastName, phoneNumber } = req.body;
      console.log(req.body)
      if (!phoneNumber || !firstName) {
        return res.status(400).json({ message: 'First name and phone number are required' });
      }
      const result = await userService.register({ firstName, lastName, phoneNumber });
      return res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  async getMe(req, res, next) {
    try {
      const profile = await userService.getProfile(req.user.id);
      return res.json(profile);
    } catch (err) {
      next(err);
    }
  }

  async getAll(req, res, next) {
    try {
      const users = await userService.getAllUsers();
      return res.json(users);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new UserController();

