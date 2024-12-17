const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema(
  {
    contentId: { type: mongoose.Schema.Types.ObjectId, required: true },
    contentType: { type: String, enum: ['question', 'answer'], required: true },
    reason: { type: String, required: true },
    details: { type: String },
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { 
      type: String, 
      default: 'pending', 
      enum: ['pending', 'reviewed', 'dismissed'] 
    },
    moderatorNote: { type: String },
    moderatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    moderatedAt: { type: Date },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    },
    actionTaken: {
      type: String,
      enum: ['none', 'warning', 'content_removed', 'user_suspended'],
      default: 'none'
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Report', ReportSchema);