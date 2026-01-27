import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedAlerts() {
  console.log('🌱 Seeding alerts data...');

  // Create notification channels
  const adminEmail = await prisma.notificationChannel.upsert({
    where: { id: 'ch1' },
    update: {},
    create: {
      id: 'ch1',
      name: 'Admin Email',
      type: 'email',
      enabled: true,
      config: {
        email: 'admin@example.com'
      }
    }
  });

  const opsTelegram = await prisma.notificationChannel.upsert({
    where: { id: 'ch2' },
    update: {},
    create: {
      id: 'ch2',
      name: 'Ops Team Telegram',
      type: 'telegram',
      enabled: true,
      config: {
        chatId: '-1001234567890',
        botToken: '1234567890:ABCdefGHI...'
      }
    }
  });

  const devEmail = await prisma.notificationChannel.upsert({
    where: { id: 'ch3' },
    update: {},
    create: {
      id: 'ch3',
      name: 'Dev Team Email',
      type: 'email',
      enabled: false,
      config: {
        email: 'dev@example.com'
      }
    }
  });

  console.log('✅ Created notification channels:', { adminEmail, opsTelegram, devEmail });

  // Create alert rules
  const cpuAlert = await prisma.alertRule.upsert({
    where: { id: 'ar1' },
    update: {},
    create: {
      id: 'ar1',
      name: 'High CPU Usage',
      condition: 'cpu > threshold',
      threshold: 80,
      severity: 'warning',
      enabled: true,
      channels: {
        create: [
          { channelId: 'ch1' },
          { channelId: 'ch2' }
        ]
      }
    }
  });

  const backendDownAlert = await prisma.alertRule.upsert({
    where: { id: 'ar2' },
    update: {},
    create: {
      id: 'ar2',
      name: 'Backend Down',
      condition: 'http_status == 0',
      threshold: 1,
      severity: 'critical',
      enabled: true,
      channels: {
        create: [
          { channelId: 'ch1' },
          { channelId: 'ch2' }
        ]
      }
    }
  });

  const sslAlert = await prisma.alertRule.upsert({
    where: { id: 'ar3' },
    update: {},
    create: {
      id: 'ar3',
      name: 'SSL Certificate Expiring Soon',
      condition: 'ssl_days_remaining < threshold',
      threshold: 30,
      severity: 'warning',
      enabled: true,
      channels: {
        create: [
          { channelId: 'ch1' }
        ]
      }
    }
  });

  console.log('✅ Created alert rules:', { cpuAlert, backendDownAlert, sslAlert });

  console.log('🎉 Alerts seeding completed!');
}

seedAlerts()
  .catch((e) => {
    console.error('❌ Error seeding alerts:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
