const jwt = require('jsonwebtoken');
const { User } = require('../models');

function generateToken(user) {
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

exports.login = async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    if (!phoneNumber || !phoneNumber.trim()) {
      return res.status(400).json({ message: 'Phone number is required' });
    }

    const cleanPhone = phoneNumber.trim();

    // Find or create for demo / player friendliness
    let user = await User.findOne({ where: { phoneNumber: cleanPhone } });

    if (!user) {
      // If logging in with admin credentials for the first time, make it admin
      const isAdminPhone = cleanPhone === '0911000000' || cleanPhone === '+251911000000' || cleanPhone.toLowerCase() === 'admin';
      user = await User.create({
        firstName: isAdminPhone ? 'Admin' : 'Player',
        lastName: 'User',
        phoneNumber: cleanPhone,
        role: isAdminPhone ? 'ADMIN' : 'PLAYER',
      });
    }

    const token = generateToken(user);
    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.phoneNumber;

    return res.json({
      token,
      user: {
        id: String(user.id),
        name: fullName,
        phone: user.phoneNumber,
        role: user.role,
      },
      success: true,
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Internal server error during login' });
  }
};

exports.register = async (req, res) => {
  try {
    const { firstName, lastName, phoneNumber } = req.body;
    if (!phoneNumber || !firstName) {
      return res.status(400).json({ message: 'First name and phone number are required' });
    }

    const cleanPhone = phoneNumber.trim();
    let existing = await User.findOne({ where: { phoneNumber: cleanPhone } });
    if (existing) {
      return res.status(409).json({ message: 'Phone number already registered. Please log in.' });
    }

    const user = await User.create({
      firstName: firstName.trim(),
      lastName: lastName ? lastName.trim() : '',
      phoneNumber: cleanPhone,
      role: 'PLAYER',
    });

    const token = generateToken(user);
    const fullName = `${user.firstName} ${user.lastName || ''}`.trim();

    return res.status(201).json({
      token,
      user: {
        id: String(user.id),
        name: fullName,
        phone: user.phoneNumber,
        role: user.role,
      },
      success: true,
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ message: 'Internal server error during registration' });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'firstName', 'lastName', 'phoneNumber', 'role', 'createdAt'],
    });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.json({
      id: String(user.id),
      name: `${user.firstName} ${user.lastName || ''}`.trim(),
      phone: user.phoneNumber,
      role: user.role,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

