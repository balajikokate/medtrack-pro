const app = require('./app');
const { startReminderScheduler } = require('./jobs/reminderScheduler');

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`MedTrack Pro API running on port ${PORT}`);
  startReminderScheduler();
});
