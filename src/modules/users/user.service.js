const jwt = require('jsonwebtoken');
const User = require('./user.model');

class UserService {
  generateToken(user) {
    return jwt.sign(
      {
        id: user.id,
        phoneNumber: user.phoneNumber,
        role: user.role,
      },
      process.env.JWT_SECRET || 'super_secret_bingo_jwt_key_2026_change_in_production',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
  }

  async login(phoneNumber) {
    const cleanPhone = phoneNumber.trim();
    let user = await User.findOne({ where: { phoneNumber: cleanPhone } });

    if (!user) {
      // Auto-create for demo/testing friendliness
      const isAdminPhone = cleanPhone === '0911000000' || cleanPhone === '+251911000000' || cleanPhone.toLowerCase() === 'admin';
      user = await User.create({
        firstName: isAdminPhone ? 'Admin' : 'Player',
        lastName: 'User',
        phoneNumber: cleanPhone,
        role: isAdminPhone ? 'ADMIN' : 'PLAYER',
      });
    }

    const token = this.generateToken(user);
    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.phoneNumber;

    return {
      token,
      user: {
        id: String(user.id),
        name: fullName,
        phone: user.phoneNumber,
        role: user.role,
      },
      success: true,
    };
  }

  async register({ firstName, lastName, phoneNumber }) {
    const cleanPhone = phoneNumber.trim();
    const existing = await User.findOne({ where: { phoneNumber: cleanPhone } });
    if (existing) {
      const error = new Error('Phone number already registered. Please log in.');
      error.status = 409;
      throw error;
    }

    const user = await User.create({
      firstName: firstName.trim(),
      lastName: lastName ? lastName.trim() : '',
      phoneNumber: cleanPhone,
      role: 'PLAYER',
    });

    const token = this.generateToken(user);
    const fullName = `${user.firstName} ${user.lastName || ''}`.trim();

    return {
      token,
      user: {
        id: String(user.id),
        name: fullName,
        phone: user.phoneNumber,
        role: user.role,
      },
      success: true,
    };
  }

  async getProfile(userId) {
    const user = await User.findByPk(userId, {
      attributes: ['id', 'firstName', 'lastName', 'phoneNumber', 'role', 'createdAt'],
    });
    if (!user) {
      const error = new Error('User not found');
      error.status = 404;
      throw error;
    }
    return {
      id: String(user.id),
      name: `${user.firstName} ${user.lastName || ''}`.trim(),
      phone: user.phoneNumber,
      role: user.role,
    };
  }

  async getAllUsers() {
    return await User.findAll({
      attributes: ['id', 'firstName', 'lastName', 'phoneNumber', 'role', 'createdAt'],
      order: [['createdAt', 'DESC']],
    });
  }
}

module.exports = new UserService();

