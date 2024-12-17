const mongoose = require('mongoose');

const AnswerSchema = new mongoose.Schema(
  {
    content: { type: String, required: true },
    question: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    votes: { type: Number, default: 0 },
    status: {
      type: String,
      default: 'active',
      enum: ['active', 'removed', 'flagged']
    },
    moderatorNote: { type: String },
    moderatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    moderatedAt: { type: Date },
    isAccepted: { type: Boolean, default: false },
    voters: [{
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      vote: { type: Number, enum: [-1, 1] }
    }]
  },
  { timestamps: true }
);

module.exports = mongoose.model('Answer', AnswerSchema);