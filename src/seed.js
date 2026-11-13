require('dotenv').config();
const { sequelize, User, Game, GameNumber, PaymentProof } = require('./modules');

async function seed() {
  try {
    console.log('🔄 Synchronizing modular database tables...');
    const isSqlite = sequelize.getDialect ? sequelize.getDialect() === 'sqlite' : false;
    await sequelize.sync({ alter: !isSqlite });
    console.log('✅ Tables synchronized.');

    // 1. Seed Users
    let admin = await User.findOne({ where: { phoneNumber: '0911000000' } });
    if (!admin) {
      admin = await User.create({
        firstName: 'Bingo',
        lastName: 'Administrator',
        phoneNumber: '0911000000',
        role: 'ADMIN',
      });
      console.log('👤 Created Admin user (0911000000)');
    }

    let player = await User.findOne({ where: { phoneNumber: '0912345678' } });
    if (!player) {
      player = await User.create({
        firstName: 'Gemechu',
        lastName: 'Jima',
        phoneNumber: '0912345678',
        role: 'PLAYER',
      });
      console.log('👤 Created Player user (0912345678)');
    }

    // 2. Seed Games
    let game1 = await Game.findOne({ where: { title: 'Weekend Bingo' } });
    if (!game1) {
      game1 = await Game.create({
        title: 'Weekend Bingo',
        totalNumbers: 50,
        status: 'ACTIVE',
        numberPrice: 100.0,
        reservationMinutes: 5,
        prizeDistribution: { first: 60, second: 20, third: 10, fourth: 0, system: 10 },
        createdBy: admin.id,
      });

      // Seed 50 numbers directly with reservation fields
      const numbers = [];
      for (let i = 1; i <= 50; i++) {
        const isNum8 = i === 8;
        const isNum21 = i === 21;
        
        numbers.push({
          gameId: game1.id,
          number: i,
          status: isNum8 ? 'RESERVED' : isNum21 ? 'CONFIRMED' : 'AVAILABLE',
          userId: (isNum8 || isNum21) ? player.id : null,
          createdById: admin.id,                        // admin who seeded the game
          confirmedById: isNum21 ? admin.id : null,     // admin who confirmed #21
          expiresAt: isNum8 
            ? new Date(Date.now() + 5 * 60 * 1000)
            : isNum21
              ? new Date(Date.now() + 60 * 60 * 1000)
              : null,
        });
      }
      await GameNumber.bulkCreate(numbers);
      console.log('🎱 Seeded Weekend Bingo (#1) with 50 numbers (including sample reserved #8 and confirmed #21)');

      // Seed sample payment proof for #8 (UNDER_REVIEW)
      const num8 = await GameNumber.findOne({ where: { gameId: game1.id, number: 8 } });
      if (num8) {
        await PaymentProof.create({
          numberId: num8.id,
          reservationId: num8.id,
          userId: player.id,
          gameId: game1.id,
          amount: 100.0,
          provider: 'CBE',
          transactionReference: 'FT261102CBE8992',
          status: 'UNDER_REVIEW',
        });
        console.log('💳 Seeded sample payment proof for number #8');
      }
    }

    let game2 = await Game.findOne({ where: { title: 'Evening Bingo' } });
    if (!game2) {
      game2 = await Game.create({
        title: 'Evening Bingo',
        totalNumbers: 30,
        status: 'ACTIVE',
        numberPrice: 50.0,
        reservationMinutes: 7,
        prizeDistribution: { first: 60, second: 20, third: 10, fourth: 0, system: 10 },
        createdBy: admin.id,
      });

      const numbers2 = [];
      for (let i = 1; i <= 30; i++) {
        numbers2.push({
          gameId: game2.id,
          number: i,
          status: 'AVAILABLE',
          userId: null,
          createdById: admin.id,  // admin who seeded the game
          confirmedById: null,
          expiresAt: null,
        });
      }
      await GameNumber.bulkCreate(numbers2);
      console.log('🎱 Seeded Evening Bingo (#2) with 30 numbers');
    }

    console.log('🎉 Seed completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  }
}

seed();
