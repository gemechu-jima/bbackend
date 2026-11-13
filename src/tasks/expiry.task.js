const cron = require('node-cron');
const { Op } = require('sequelize');
const { GameNumber } = require('../modules');

function startExpiryCron() {
  console.log('⏱️ Reservation expiry worker started (monitoring every 30s)...');

  cron.schedule('*/30 * * * * *', async () => {
    try {
      const now = new Date();
      const [releasedCount] = await GameNumber.update(
        {
          status: 'AVAILABLE',
          userId: null,
          expiresAt: null,
        },
        {
          where: {
            status: 'RESERVED',
            expiresAt: {
              [Op.lte]: now,
            },
          },
        }
      );

      if (releasedCount > 0) {
        console.log(`⏳ Auto-expired ${releasedCount} reservation(s). Released numbers back to AVAILABLE.`);
      }
    } catch (err) {
      console.error('Error in reservation expiry worker:', err);
    }
  });
}

module.exports = { startExpiryCron };
