const AuditEvent = require('./audit.model');

class AuditService {
  async log({ actorId, action, reason, details }) {
    return await AuditEvent.create({
      actorId,
      action,
      reason,
      details,
    });
  }

  async getAll() {
    return await AuditEvent.findAll({
      order: [['createdAt', 'DESC']],
    });
  }
}

module.exports = new AuditService();

