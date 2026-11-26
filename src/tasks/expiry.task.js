const cron = require('node-cron');
const { Op } = require('sequelize');
const { GameNumber } = require('../modules');
const sequelize = require('../config/database');
const Game = require('../modules/games/game.model');
const Draw = require('../modules/draws/draw.model');
const Payment = require('../modules/payments/payment.model');
const { broadcastNumbersRefresh } = require('../utils/realtime');
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
        broadcastNumbersRefresh();
      }
    } catch (err) {
      console.error('Error in reservation expiry worker:', err);
    }
  });
}



const RETENTION_DAYS = Number(process.env.COMPLETED_GAME_RETENTION_DAYS) || 7;

async function cleanupExpiredReservations() {
  const now = new Date();
  await GameNumber.update(
    {
      status: 'AVAILABLE',
      reservedBy: null,
      reservedUntil: null,
      paymentId: null,
    },
    {
      where: {
        status: 'RESERVED',
        reservedUntil: { [Op.lt]: now },
        paymentId: null,
      },
    }
  );
}

async function cleanupOldCompletedGames() {
  const cutoffDate = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);

  // Find completed games older than 7 days
  const oldGames = await Game.findAll({
    where: {
      status: { [Op.in]: ['COMPLETED', 'DRAWN', 'FINISHED'] },
      updatedAt: { [Op.lt]: cutoffDate },
    },
    attributes: ['id', 'title'],
  });

  if (oldGames.length === 0) return;

  const gameIds = oldGames.map((g) => g.id);

  await sequelize.transaction(async (t) => {
    // Delete child records first to satisfy PostgreSQL foreign key constraints
    await Draw.destroy({ where: { gameId: { [Op.in]: gameIds } }, transaction: t });
    await Payment.destroy({ where: { gameId: { [Op.in]: gameIds } }, transaction: t });
    await GameNumber.destroy({ where: { gameId: { [Op.in]: gameIds } }, transaction: t });
    await Game.destroy({ where: { id: { [Op.in]: gameIds } }, transaction: t });
  });

  console.log(
    `[Cleanup] Deleted ${gameIds.length} completed game(s) older than ${RETENTION_DAYS} days:`,
    gameIds
  );
}

function startBackgroundTasks() {
  // Release expired unpaid reservations every 1 minute
  setInterval(() => {
    cleanupExpiredReservations().catch((err) =>
      console.error('[Task] Reservation expiry error:', err)
    );
  }, 60 * 1000);

  // Run completed game cleanup once at startup, then every 6 hours
  cleanupOldCompletedGames().catch((err) =>
    console.error('[Task] Completed game cleanup error:', err)
  );
  setInterval(() => {
    cleanupOldCompletedGames().catch((err) =>
      console.error('[Task] Completed game cleanup error:', err)
    );
  }, 6 * 60 * 60 * 1000);
}


module.exports = { startExpiryCron, 
  startBackgroundTasks,
   cleanupExpiredReservations,
  cleanupOldCompletedGames, };
