const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  content: {
    type: String,
    required: [true, 'Message content is required'],
    trim: true,
  },
  sender: {
    type: String,
    enum: ['guest', 'manager', 'ai_assistant', 'system'],
    required: true,
  },
  senderName: {
    type: String,
    trim: true,
    required: true,
  },
}, { timestamps: true });

const ticketSchema = new mongoose.Schema(
  {
    room: {
      type: mongoose.Schema.ObjectId,
      ref: 'Room',
      required: [true, 'Room reference is required'],
    },
    roomNumber: {
      type: String,
      required: [true, 'Room number is required'],
      trim: true,
    },
    categories: [{
      type: String,
      enum: ['reception', 'housekeeping', 'porter', 'concierge', 'service_fb', 'maintenance'],
    }],
    category: {
      type: String,
      enum: ['reception', 'housekeeping', 'porter', 'concierge', 'service_fb', 'maintenance'],
      default: 'reception',
      index: true,
    },
    status: {
      type: String,
      enum: ['raised', 'in_progress', 'completed'],
      default: 'raised',
    },
    messages: [messageSchema],
    guestInfo: {
      name: {
        type: String,
        required: [true, 'Guest name is required'],
        trim: true,
      },
      email: {
        type: String,
        trim: true,
        lowercase: true,
      },
      phone: {
        type: String,
        trim: true,
      },
    },
    manager: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true,
    },
    subject: {
      type: String,
      trim: true,
      default: 'Service Request',
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for common queries
ticketSchema.index({ manager: 1, status: 1 });
ticketSchema.index({ room: 1, status: 1 });
ticketSchema.index({ 'guestInfo.name': 'text', 'guestInfo.email': 'text' });

// Static method to get ticket statistics
ticketSchema.statics.getStats = async function(managerId) {
  const stats = await this.aggregate([
    {
      $match: { manager: managerId }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  return stats.reduce((acc, curr) => {
    acc[curr._id] = curr.count;
    return acc;
  }, { raised: 0, in_progress: 0, completed: 0 });
};

// Update status timestamp when ticket is completed
ticketSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    if (this.status === 'completed' && !this.completedAt) {
      this.completedAt = new Date();
    } else if (this.status !== 'completed') {
      // Reset completedAt if status changes away from completed
      this.completedAt = null;
    }
  }
  next();
});

// Static method to clean up old completed tickets
ticketSchema.statics.cleanupOldTickets = async function() {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  try {
    const result = await this.deleteMany({
      status: 'completed',
      completedAt: { $lt: twentyFourHoursAgo, $ne: null }
    });
    
    console.log(`🗑️ Cleaned up ${result.deletedCount} completed tickets older than 24 hours`);
    return result.deletedCount;
  } catch (error) {
    console.error('Error cleaning up old tickets:', error);
    return 0;
  }
};

module.exports = mongoose.model('Ticket', ticketSchema);
