const cron = require('node-cron');
const Ticket = require('../models/Ticket');

class TicketCleanupService {
  constructor() {
    this.isRunning = false;
  }

  // Start the cleanup service
  start() {
    if (this.isRunning) {
      console.log('⚠️ Ticket cleanup service is already running');
      return;
    }

    // Run cleanup every hour (0 minutes of every hour)
    this.cronJob = cron.schedule('0 * * * *', async () => {
      await this.performCleanup();
    }, {
      scheduled: false,
      timezone: 'Asia/Kolkata'
    });

    // Start the cron job
    this.cronJob.start();
    this.isRunning = true;

    console.log('🧹 Ticket cleanup service started - will run every hour');
    
    // Run initial cleanup after 5 seconds
    setTimeout(() => {
      this.performCleanup();
    }, 5000);
  }

  // Stop the cleanup service
  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.isRunning = false;
      console.log('🛑 Ticket cleanup service stopped');
    }
  }

  // Perform the actual cleanup
  async performCleanup() {
    try {
      console.log('🔍 Starting ticket cleanup process...');
      const deletedCount = await Ticket.cleanupOldTickets();
      
      if (deletedCount > 0) {
        console.log(`✅ Successfully deleted ${deletedCount} old completed tickets`);
      } else {
        console.log('ℹ️ No old completed tickets found for cleanup');
      }
    } catch (error) {
      console.error('❌ Error during ticket cleanup:', error);
    }
  }

  // Manual cleanup trigger (for testing)
  async manualCleanup() {
    console.log('🔧 Manual cleanup triggered');
    await this.performCleanup();
  }

  // Get service status
  getStatus() {
    return {
      isRunning: this.isRunning,
      nextRun: this.cronJob ? this.cronJob.nextDates().toString() : null
    };
  }
}

module.exports = new TicketCleanupService();
