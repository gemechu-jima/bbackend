const userService = require('./user.service');

class UserController {
  async login(req, res, next) {
    try {
     const { phoneNumber, activationCode } = req.body;
      if (!phoneNumber || !phoneNumber.trim()) {
        return res.status(400).json({ message: 'Phone number is required' });
      }
    const result = await userService.login(phoneNumber, activationCode);
    return res.status(200).json(result);
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
  async updateActivation(req, res, next) {
  try {
    const isActivated =
      typeof req.body.isActivated === 'boolean'
        ? req.body.isActivated
        : req.body.status === 'ACTIVE';

    const user = await userService.updateActivation(req.params.id, isActivated);
    return res.status(200).json(user);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ success: false, message: err.message });
    }
    next(err);
  }
}
async updateMe(req, res, next) {
    try {
      const result = await userService.updateProfile(req.user.id, {
        name: req.body.name,
        phoneNumber: req.body.phoneNumber,
      });
      return res.status(200).json(result);
    } catch (err) {
      if (err.status) {
        return res.status(err.status).json({
          success: false,
          message: err.message,
        });
      }
      next(err);
    }
  }
  async updateUserByAdmin(req, res, next) {
  try {
    const updated = await userService.updateUserByAdmin(req.params.id, req.body);
    return res.status(200).json(updated);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    next(err);
  }
}

async deleteUser(req, res, next) {
  try {
    await userService.deleteUser(req.params.id);
    return res.status(200).json({ success: true, message: 'Player deleted.' });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    next(err);
  }
}
async toggleActivation(req, res, next) {
  try {
    const updated = await userService.toggleActivation(
      req.params.id,
      req.body.isActivated
    );
    return res.status(200).json(updated);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    next(err);
  }
}
async registerAndSendCode(req, res, next) {
    try {
      const { firstName, lastName, phoneNumber } = req.body;
      if (!phoneNumber || !firstName) {
        return res.status(400).json({ message: 'First name and phone number are required' });
      }
      const result = await userService.registerAndSendCode({
        firstName,
        lastName,
        phoneNumber,
      });
      return res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

}

module.exports = new UserController();

