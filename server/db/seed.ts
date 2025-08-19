import { db } from '../db';
import { users, plans, megaCredentials } from '@shared/schema';
import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';

export async function seedDatabase() {
  console.log('🌱 Starting database seeding...');

  try {
    // Create test plans
    console.log('📋 Creating test plans...');
    
    const existingPlans = await db.select().from(plans);
    if (existingPlans.length === 0) {
      await db.insert(plans).values([
        {
          id: 'basic',
          name: 'Basic',
          storageLimit: '2147483648', // 2GB
          pricePerMonth: '0',
          apiCallsPerHour: 100,
        },
        {
          id: 'pro',
          name: 'Pro',
          storageLimit: '5368709120', // 5GB
          pricePerMonth: '9.99',
          apiCallsPerHour: 1000,
        },
        {
          id: 'premium',
          name: 'Premium',
          storageLimit: '10737418240', // 10GB
          pricePerMonth: '19.99',
          apiCallsPerHour: 5000,
        },
      ]);
      console.log('✅ Test plans created successfully');
    } else {
      console.log('📋 Plans already exist, skipping...');
    }

    // Create admin user
    console.log('👨‍💼 Creating admin user...');
    const adminPasswordHash = await bcrypt.hash('admin123', 10);
    
    const existingAdmin = await db.select().from(users).where(eq(users.email, 'admin@megafilemanager.com'));
    if (existingAdmin.length === 0) {
      await db.insert(users).values({
        email: 'admin@megafilemanager.com',
        passwordHash: adminPasswordHash,
        firstName: 'Admin',
        lastName: 'User',
        planId: 'premium',
        isAdmin: true,
        storageUsed: '0',
      });
      console.log('✅ Admin user created: admin@megafilemanager.com / admin123');
    } else {
      console.log('👨‍💼 Admin user already exists, skipping...');
    }

    // Create test user
    console.log('👤 Creating test user...');
    const userPasswordHash = await bcrypt.hash('user123', 10);
    
    const existingUser = await db.select().from(users).where(eq(users.email, 'user@test.com'));
    if (existingUser.length === 0) {
      await db.insert(users).values({
        email: 'user@test.com',
        passwordHash: userPasswordHash,
        firstName: 'Test',
        lastName: 'User',
        planId: 'pro',
        isAdmin: false,
        storageUsed: '0',
      });
      console.log('✅ Test user created: user@test.com / user123');
    } else {
      console.log('👤 Test user already exists, skipping...');
    }

    // Create test user with phone
    console.log('📱 Creating phone test user...');
    const phoneUserPasswordHash = await bcrypt.hash('phone123', 10);
    
    const existingPhoneUser = await db.select().from(users).where(eq(users.phone, '+351912345678'));
    if (existingPhoneUser.length === 0) {
      await db.insert(users).values({
        phone: '+351912345678',
        passwordHash: phoneUserPasswordHash,
        firstName: 'João',
        lastName: 'Silva',
        planId: 'basic',
        isAdmin: false,
        storageUsed: '0',
      });
      console.log('✅ Phone test user created: +351912345678 / phone123');
    } else {
      console.log('📱 Phone test user already exists, skipping...');
    }

    // Create sample MEGA credentials (for admin testing)
    console.log('🔑 Creating sample MEGA credentials...');
    const existingCredentials = await db.select().from(megaCredentials);
    if (existingCredentials.length === 0) {
      const megaPasswordHash = await bcrypt.hash('mega-password-placeholder', 10);
      await db.insert(megaCredentials).values({
        email: 'your-mega-email@example.com',
        passwordHash: megaPasswordHash,
        isActive: false, // Set to false by default - admin needs to configure real credentials
      });
      console.log('✅ Sample MEGA credentials created (inactive - admin needs to configure)');
    } else {
      console.log('🔑 MEGA credentials already exist, skipping...');
    }

    console.log('🎉 Database seeding completed successfully!');
    console.log('\n📝 Test Accounts Created:');
    console.log('👨‍💼 Admin: admin@megafilemanager.com / admin123 (Premium plan)');
    console.log('👤 User: user@test.com / user123 (Pro plan)');
    console.log('📱 Phone User: +351912345678 / phone123 (Basic plan)');
    console.log('\n💡 Next steps:');
    console.log('1. Login as admin to configure real MEGA credentials');
    console.log('2. Test file uploads with the test users');
    console.log('3. Generate API keys for testing developer endpoints');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

// Run seed if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}