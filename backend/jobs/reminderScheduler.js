const cron = require('node-cron');
const prisma = require('../config/prisma');
const { sendPOReminderEmail } = require('../utils/email');

const HOUR = 60 * 60 * 1000;
const URGENT_WINDOW = 24 * HOUR; // needed within a day of creation → hourly reminders
const URGENT_CADENCE = 1 * HOUR;
const NORMAL_CADENCE = 8 * HOUR;
const MAX_REMINDERS = 2;

async function runReminderSweep() {
  const pending = await prisma.purchaseOrder.findMany({
    where: { status: 'Pending', reminderCount: { lt: MAX_REMINDERS } },
    include: { supplier: true },
  });

  const now = Date.now();

  for (const po of pending) {
    const createdAt = new Date(po.createdAt).getTime();
    const neededBy = new Date(po.neededByDate).getTime();
    const isUrgent = neededBy - createdAt <= URGENT_WINDOW;
    const cadence = isUrgent ? URGENT_CADENCE : NORMAL_CADENCE;
    const since = po.lastReminderAt ? new Date(po.lastReminderAt).getTime() : createdAt;

    if (now - since < cadence) continue;

    const nextReminderNumber = po.reminderCount + 1;
    try {
      await sendPOReminderEmail(po.supplier, po, nextReminderNumber);
    } catch (err) {
      console.error(`[reminders] failed to send reminder for ${po.poNumber}:`, err.message);
    }
    await prisma.purchaseOrder.update({
      where: { id: po.id },
      data: { reminderCount: nextReminderNumber, lastReminderAt: new Date() },
    });
    console.log(`[reminders] sent reminder ${nextReminderNumber}/${MAX_REMINDERS} for ${po.poNumber}`);
  }
}

function startReminderScheduler() {
  // Every 15 minutes. On a host that sleeps when idle (e.g. Render free tier),
  // this only fires while the process is awake — reminders can be delayed until
  // the next incoming request wakes it up.
  cron.schedule('*/15 * * * *', () => {
    runReminderSweep().catch((err) => console.error('[reminders] sweep failed:', err));
  });
  console.log('[reminders] scheduler started (every 15 min)');
}

module.exports = { startReminderScheduler, runReminderSweep };
