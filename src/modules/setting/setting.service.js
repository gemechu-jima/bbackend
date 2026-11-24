const Setting = require('./setting.model');

class SettingService {
  async getSettings() {
    const [setting] = await Setting.findOrCreate({
      where: { id: 1 },
      defaults: {
        id: 1,
        platformName: 'Bingo Platform',
        currency: 'ETB',
        defaultReservationMinutes: 30,
      },
    });
    return setting;
  }

  async updateSettings({ platformName, currency, defaultReservationMinutes }) {
    const setting = await this.getSettings();

    const cleanName =
      typeof platformName === 'string' && platformName.trim()
        ? platformName.trim()
        : setting.platformName;

    const cleanCurrency =
      typeof currency === 'string' && currency.trim()
        ? currency.trim().toUpperCase()
        : setting.currency;

    const parsedMinutes = Number(defaultReservationMinutes);
    if (!Number.isFinite(parsedMinutes) || parsedMinutes < 1 || parsedMinutes > 1440) {
      const error = new Error('Default reservation minutes must be between 1 and 1440.');
      error.status = 400;
      throw error;
    }

    setting.platformName = cleanName;
    setting.currency = cleanCurrency;
    setting.defaultReservationMinutes = Math.round(parsedMinutes);
    await setting.save();

    return setting;
  }
}

module.exports = new SettingService();