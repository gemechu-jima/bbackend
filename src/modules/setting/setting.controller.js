const settingService = require('./setting.service');

class SettingController {
  async getSettings(req, res, next) {
    try {
      const settings = await settingService.getSettings();
      return res.status(200).json(settings);
    } catch (err) {
      next(err);
    }
  }

  async updateSettings(req, res, next) {
    try {
      const updated = await settingService.updateSettings(req.body);
      return res.status(200).json(updated);
    } catch (err) {
      if (err.status) {
        return res.status(err.status).json({ message: err.message });
      }
      next(err);
    }
  }
}

module.exports = new SettingController();