const express = require('express');
const Question = require('../models/Question');
const Answer = require('../models/Answer');
const Report = require('../models/Report');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');
const router = express.Router();

// Get questions for review with pagination
router.get('/review-queue', authMiddleware, roleMiddleware('moderator', 'admin'), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const questions = await Question.find({ status: 'under review' })
      .populate('user', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Question.countDocuments({ status: 'under review' });
    const totalPages = Math.ceil(total / limit);

    res.json({
      questions,
      currentPage: page,
      totalPages,
      totalQuestions: total
    });
  } catch (err) {
    console.error('Error fetching review queue:', err);
    res.status(500).json({ message: 'Error fetching questions for review' });
  }
});

// Get reported content with pagination
router.get('/reported-content', authMiddleware, roleMiddleware('moderator', 'admin'), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const reports = await Report.find({ status: 'pending' })
      .populate('reportedBy', 'name')
      .populate({
        path: 'contentId',
        select: 'title content user',
        populate: { path: 'user', select: 'name' }
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Report.countDocuments({ status: 'pending' });
    const totalPages = Math.ceil(total / limit);

    res.json({
      reports,
      currentPage: page,
      totalPages,
      totalReports: total
    });
  } catch (err) {
    console.error('Error fetching reported content:', err);
    res.status(500).json({ message: 'Error fetching reported content' });
  }
});

// Moderate a question
router.put('/questions/:id/moderate', authMiddleware, roleMiddleware('moderator', 'admin'), async (req, res) => {
  try {
    const { status, moderationNote } = req.body;
    const question = await Question.findByIdAndUpdate(
      req.params.id,
      {
        status,
        moderatorNote: moderationNote,
        moderatedBy: req.user.id,
        moderatedAt: new Date()
      },
      { new: true }
    ).populate('user', 'name');

    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    res.json(question);
  } catch (err) {
    console.error('Error moderating question:', err);
    res.status(500).json({ message: 'Error updating question status' });
  }
});

// Handle reported content
router.put('/reports/:id/moderate', authMiddleware, roleMiddleware('moderator', 'admin'), async (req, res) => {
  try {
    const { action, moderationNote } = req.body;
    const report = await Report.findById(req.params.id);

    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    report.status = 'reviewed';
    report.moderatorNote = moderationNote;
    report.moderatedBy = req.user.id;
    report.moderatedAt = new Date();
    report.actionTaken = action;

    if (action === 'remove') {
      if (report.contentType === 'question') {
        await Question.findByIdAndUpdate(report.contentId, {
          status: 'removed',
          moderatorNote,
          moderatedBy: req.user.id,
          moderatedAt: new Date()
        });
      } else if (report.contentType === 'answer') {
        await Answer.findByIdAndUpdate(report.contentId, {
          status: 'removed',
          moderatorNote,
          moderatedBy: req.user.id,
          moderatedAt: new Date()
        });
      }
    }

    await report.save();
    res.json(report);
  } catch (err) {
    console.error('Error handling report:', err);
    res.status(500).json({ message: 'Error processing report' });
  }
});

// Get moderator statistics
router.get('/stats', authMiddleware, roleMiddleware('moderator', 'admin'), async (req, res) => {
  try {
    const [totalModerated, pendingItems, recentActivity] = await Promise.all([
      Question.countDocuments({ 
        moderatedBy: req.user.id,
        status: { $in: ['resolved', 'rejected'] }
      }),
      Question.countDocuments({ status: 'under review' }),
      Question.find({
        moderatedBy: req.user.id,
        moderatedAt: { $exists: true }
      })
        .sort({ moderatedAt: -1 })
        .limit(5)
        .select('title status moderatedAt')
    ]);

    const stats = {
      totalModerated,
      pendingItems,
      averageResponseTime: '24h', // You can implement actual calculation
      resolutionRate: '85%', // You can implement actual calculation
      recentActivity: recentActivity.map(item => ({
        type: item.status === 'resolved' ? 'approval' : 'rejection',
        description: `Moderated: ${item.title}`,
        timestamp: item.moderatedAt.toLocaleString()
      }))
    };

    res.json(stats);
  } catch (err) {
    console.error('Error fetching moderator stats:', err);
    res.status(500).json({ message: 'Error fetching statistics' });
  }
});

// Add these new endpoints to moderatorRoutes.js

// Get all questions for moderator review
router.get('/questions', authMiddleware, roleMiddleware('moderator', 'admin'), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const questions = await Question.find()
      .populate('user', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Question.countDocuments();
    const totalPages = Math.ceil(total / limit);

    res.json({
      questions,
      currentPage: page,
      totalPages,
      totalQuestions: total
    });
  } catch (err) {
    console.error('Error fetching questions:', err);
    res.status(500).json({ message: 'Error fetching questions' });
  }
});

// Report a question to admin
router.post('/questions/:id/report', authMiddleware, roleMiddleware('moderator'), async (req, res) => {
  try {
    const { reason, details } = req.body;
    const questionId = req.params.id;

    // Update question status to under review
    await Question.findByIdAndUpdate(questionId, {
      status: 'under review',
      moderatorNote: details,
      moderatedBy: req.user.id,
      moderatedAt: new Date()
    });

    // Create a report
    const report = new Report({
      contentId: questionId,
      contentType: 'question',
      reason,
      details,
      reportedBy: req.user.id,
      severity: 'high', // Moderator reports are considered high priority
      status: 'pending'
    });

    await report.save();
    res.json({ message: 'Question reported successfully' });
  } catch (err) {
    console.error('Error reporting question:', err);
    res.status(500).json({ message: 'Error reporting question' });
  }
});

// Update question status with moderation note
router.put('/questions/:id/status', authMiddleware, roleMiddleware('moderator'), async (req, res) => {
  try {
    const { status, moderationNote } = req.body;
    const question = await Question.findByIdAndUpdate(
      req.params.id,
      {
        status,
        moderatorNote: moderationNote,
        moderatedBy: req.user.id,
        moderatedAt: new Date()
      },
      { new: true }
    ).populate('user', 'name');

    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    res.json(question);
  } catch (err) {
    console.error('Error updating question status:', err);
    res.status(500).json({ message: 'Error updating question status' });
  }
});

module.exports = router;