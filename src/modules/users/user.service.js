const jwt = require('jsonwebtoken');
const User = require('./user.model');
const {sendAfroSMS}= require("../../utils/smsService")
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
  async generateUniqueActivationCode() {
    let code;
    let exists = true;

    while (exists) {
      code = Math.floor(100000 + Math.random() * 900000).toString();
      const existingUser = await User.findOne({ where: { activationCode: code } });
      if (!existingUser) exists = false;
    }

    return code;
  }
  formatUserResponse(user) {
  const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.phoneNumber;
  return {
    token: this.generateToken(user),
    user: {
      id: String(user.id),
      name: fullName,
      phone: user.phoneNumber,
      role: user.role,
    },
    success: true,
  };
}
  async login(phoneNumber, activationCode) {
    const cleanPhone = phoneNumber.trim();
    const cleanCode = activationCode ? String(activationCode).trim() : '';
    console.log(cleanCode)
    let user = await User.findOne({ where: { phoneNumber: cleanPhone } });

 if (!user) {
      const userCount = await User.count();
      // Bootstrap initial Admin ONLY when the users table is completely empty
      if (userCount === 0) {
        user = await User.create({
          firstName: 'Admin',
          lastName: 'User',
          phoneNumber: cleanPhone,
          role: 'ADMIN',
          isActivated: true,
        });
      } else {
        const error = new Error('Account not found. Please register first.');
        error.status = 404;
        throw error;
      }
    }
     // FIRST-TIME LOGIN: Account is not activated yet
    if (!user.isActivated) {
      // Step A: User hasn't entered the code yet -> tell frontend to show Activation Code input
      if (!cleanCode) {
        const error = new Error('Please enter the activation code provided by Admin.');
        error.status = 403;
        error.data = {
          requiresActivation: true,
          phone: user.phoneNumber,
        };
        throw error;
      }

      // Step B: User entered a wrong code
      if (user.activationCode !== cleanCode) {
        const error = new Error('Invalid activation code. Please check with Admin.');
        error.status = 400;
        error.data = {
          requiresActivation: true,
          phone: user.phoneNumber,
        };
        throw error;
      }
      await user.update({ isActivated: true });
    }

   return this.formatUserResponse(user);
  }

  async register({ firstName, lastName, phoneNumber }) {
    const cleanPhone = phoneNumber.trim();
    const existing = await User.findOne({ where: { phoneNumber: cleanPhone } });

    if (existing) {
      const error = new Error('Phone number already registered. Please log in.');
      error.status = 409;
      throw error;
    }

    const code = await this.generateUniqueActivationCode();

const user = await User.create({
      firstName: firstName.trim(),
      lastName: lastName ? lastName.trim() : '',
      phoneNumber: cleanPhone,
      role: 'PLAYER',
      isActivated: false,
      activationCode: code,
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
      message: 'Registration successful. Please get your activation code from Admin to log in.',
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
      attributes: [
        'id',
        'firstName',
        'lastName',
        'phoneNumber',
        'role',
        'isActivated',
        'activationCode',
        'createdAt',
      ],
      order: [['createdAt', 'DESC']],
    });
  }
  async updateActivation(userId, isActivated) {
  const user = await User.findByPk(userId);
  if (!user) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }

  await user.update({ isActivated: Boolean(isActivated) });
  return user;
}

async updateProfile(userId, { name, phoneNumber }) {
    const user = await User.findByPk(userId);
    if (!user) {
      const error = new Error('User not found');
      error.status = 404;
      throw error;
    }

    const cleanName = name ? name.trim() : '';
    const cleanPhone = phoneNumber ? phoneNumber.trim() : user.phoneNumber;

    if (!cleanName) {
      const error = new Error('Full name is required.');
      error.status = 400;
      throw error;
    }

    if (!cleanPhone) {
      const error = new Error('Phone number is required.');
      error.status = 400;
      throw error;
    }

    // Check if phone number is taken by another user
    if (cleanPhone !== user.phoneNumber) {
      const existing = await User.findOne({ where: { phoneNumber: cleanPhone } });
      if (existing && String(existing.id) !== String(user.id)) {
        const error = new Error('Phone number is already in use by another account.');
        error.status = 409;
        throw error;
      }
    }

    // Split full name into firstName and lastName
    const nameParts = cleanName.split(/\s+/);
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ');

    await user.update({
      firstName,
      lastName,
      phoneNumber: cleanPhone,
    });

    return this.formatUserResponse(user);
  }
  async updateUserByAdmin(userId, { firstName, lastName, phoneNumber }) {
  const user = await User.findByPk(userId);
  if (!user) {
    const err = new Error('Player not found.');
    err.status = 404;
    throw err;
  }
  await user.update({
    firstName: firstName?.trim() || user.firstName,
    lastName: lastName?.trim() || user.lastName,
    phoneNumber: phoneNumber?.trim() || user.phoneNumber,
  });
  return user;
}

async deleteUser(userId) {
  const user = await User.findByPk(userId);
  if (!user) {
    const err = new Error('Player not found.');
    err.status = 404;
    throw err;
  }
  await user.destroy();
  return true;
}
async toggleActivation(userId, isActivated) {
  const user = await User.findByPk(userId);
  if (!user) {
    const err = new Error('Player not found.');
    err.status = 404;
    throw err;
  }

  const nextState =
    typeof isActivated === 'boolean' ? isActivated : !user.isActivated;

  await user.update({ isActivated: nextState });
  return user;
}

// Add inside UserService class right below register():
  async registerAndSendCode({ firstName, lastName, phoneNumber }) {
    const cleanPhone = phoneNumber.trim();
    const existing = await User.findOne({ where: { phoneNumber: cleanPhone } });

    if (existing) {
      const error = new Error('Phone number already registered. Please log in.');
      error.status = 409;
      throw error;
    }

    const code = await this.generateUniqueActivationCode();

    const user = await User.create({
      firstName: firstName.trim(),
      lastName: lastName ? lastName.trim() : '',
      phoneNumber: cleanPhone,
      role: 'PLAYER',
      isActivated: false,
      activationCode: code,
    });

    // Send the generated activationCode automatically via AfroMessage SMS
    await sendAfroSMS(
      cleanPhone,
      `Your activation code is ${code}. Enter this code when logging in.`
    );

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
      message: 'Registration successful. Activation code sent to your phone via SMS.',
      success: true,
    };
  }
}

module.exports = new UserService();

