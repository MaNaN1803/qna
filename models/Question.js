const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, required: true },
    images: [String],
    gpsLocation: { type: String },
    attempts: { type: String },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: {
      type: String,
      default: 'open',
      enum: ['open', 'under review', 'resolved', 'removed', 'rejected'],
    },
    answersCount: { type: Number, default: 0 },
    moderatorNote: { type: String },
    moderatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    moderatedAt: { type: Date },
    views: { type: Number, default: 0 },
    lastActivityAt: { type: Date, default: Date.now },
    tags: [String],
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'
    }
  },
  { timestamps: true }
);

QuestionSchema.index({ title: 'text', description: 'text', tags: 'text' });
module.exports = mongoose.model('Question', QuestionSchema);