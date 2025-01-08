const express = require('express');
const User = require('../models/User');
const Report = require('../models/Report');
const Question = require('../models/Question');
const Answer = require('../models/Answer');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');
const Category = require('../models/Category');
const router = express.Router();

// Get Dashboard Stats
router.get('/stats', authMiddleware, roleMiddleware('admin', 'moderator'), async (req, res) => {
  try {
    const [totalUsers, totalQuestions, totalAnswers, pendingReports] = await Promise.all([
      User.countDocuments(),
      Question.countDocuments(),
      Answer.countDocuments(),
      Report.countDocuments({ status: 'pending' })
    ]);

    res.json({
      totalUsers,
      totalQuestions,
      totalAnswers,
      pendingReports
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get All Users with Pagination and Filtering
router.get('/users', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const { page = 1, limit = 10, role, search } = req.query;
    const query = {};
    
    if (role) query.role = role;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-password')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    res.json({
      users,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update User Role
router.put('/users/:id/role', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const { role } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select('-password');
    
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete User
router.delete('/users/:id', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    // Delete all user's questions, answers, and reports
    await Promise.all([
      Question.deleteMany({ user: req.params.id }),
      Answer.deleteMany({ user: req.params.id }),
      Report.deleteMany({ reportedBy: req.params.id })
    ]);

    res.json({ message: 'User and associated content deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get Reports with Pagination and Filtering
router.get('/reports', authMiddleware, roleMiddleware('admin', 'moderator'), async (req, res) => {
  try {
    const { page = 1, limit = 10, status, type } = req.query;
    const query = {};
    
    if (status) query.status = status;
    if (type) query.contentType = type;

    const reports = await Report.find(query)
      .populate('reportedBy', 'name')
      .populate({
        path: 'contentId',
        select: 'title content',
        model: query.contentType === 'question' ? Question : Answer
      })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await Report.countDocuments(query);

    res.json({
      reports,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Handle Report
router.put('/reports/:id', authMiddleware, roleMiddleware('admin', 'moderator'), async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ message: 'Report not found' });

    const { action } = req.body;
    report.status = 'reviewed';

    if (action === 'delete') {
      if (report.contentType === 'question') {
        await Question.findByIdAndDelete(report.contentId);
        // Delete associated answers
        await Answer.deleteMany({ question: report.contentId });
      } else if (report.contentType === 'answer') {
        const answer = await Answer.findByIdAndDelete(report.contentId);
        if (answer) {
          // Update question's answer count
          await Question.findByIdAndUpdate(answer.question, {
            $inc: { answersCount: -1 }
          });
        }
      }
    } else if (action === 'warn') {
      const content = report.contentType === 'question'
        ? await Question.findById(report.contentId)
        : await Answer.findById(report.contentId);
      
      if (content) {
        // Send warning notification to user (implement notification system)
        console.log(`Warning sent to user ${content.user}`);
      }
    }

    await report.save();
    res.json(report);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get System Activity Logs
router.get('/activity-logs', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const { page = 1, limit = 20, type } = req.query;
    const query = {};
    if (type) query.type = type;

    // Implement activity logging system
    res.json({ message: 'Activity logs feature to be implemented' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// Get Analytics Data
router.get('/analytics', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const { range = 'week' } = req.query;
    const now = new Date();
    let startDate;

    switch (range) {
      case 'day':
        startDate = new Date(now.setDate(now.getDate() - 1));
        break;
      case 'month':
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case 'year':
        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      default: // week
        startDate = new Date(now.setDate(now.getDate() - 7));
    }

    const [newUsers, newQuestions, resolvedQuestions, totalAnswers] = await Promise.all([
      User.countDocuments({ createdAt: { $gte: startDate } }),
      Question.countDocuments({ createdAt: { $gte: startDate } }),
      Question.countDocuments({ status: 'resolved', updatedAt: { $gte: startDate } }),
      Answer.countDocuments({ createdAt: { $gte: startDate } })
    ]);

    // Get top categories
    const questions = await Question.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    const topCategories = questions.map(q => ({
      name: q._id || 'Uncategorized',
      count: q.count
    }));

    // Get daily activity
    const dailyStats = await Question.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 }
      }},
      { $sort: { _id: -1 } },
      { $limit: 7 }
    ]);

    const resolutionRate = resolvedQuestions > 0 ? 
      Math.round((resolvedQuestions / newQuestions) * 100) : 0;

    const avgResponseTime = '24h'; // You can implement actual calculation

    res.json({
      contentMetrics: {
        newUsers,
        newQuestions,
        resolutionRate: `${resolutionRate}%`,
        avgResponseTime
      },
      topCategories,
      dailyStats: dailyStats.map(stat => ({
        type: 'question',
        description: `${stat.count} questions created`,
        timestamp: stat._id
      }))
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get System Settings
router.get('/settings', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    // You might want to create a Settings model for this
    const settings = {
      questionModeration: true,
      autoFlagThreshold: 3,
      userReputationThreshold: 50,
      allowAnonymousReports: true,
      moderationCategories: ['Spam', 'Abuse', 'Inappropriate', 'Other'],
      notificationSettings: {
        emailNotifications: true,
        adminAlerts: true,
        moderatorAlerts: true
      },
      contentFilters: {
        enabled: true,
        keywords: ['spam', 'abuse', 'inappropriate']
      }
    };
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update System Settings
router.put('/settings', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    // Here you would update your settings in the database
    // For now, we'll just echo back the settings
    const settings = req.body;
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add these new endpoints to adminRoutes.js

// Get reported questions with pagination and filtering
router.get('/reported-questions', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const query = { status: status || 'under review' };

    const questions = await Question.find(query)
      .populate('user', 'name')
      .populate('moderatedBy', 'name')
      .sort({ moderatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Question.countDocuments(query);

    res.json({
      questions,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Handle reported question
router.put('/questions/:id/handle-report', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const { action, adminNote } = req.body;
    const question = await Question.findById(req.params.id);
    
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    // Update the question based on action
    switch (action) {
      case 'approve':
        question.status = 'open';
        break;
      case 'reject':
        question.status = 'rejected';
        break;
      case 'delete':
        await Question.findByIdAndDelete(req.params.id);
        // Delete associated answers and reports
        await Promise.all([
          Answer.deleteMany({ question: req.params.id }),
          Report.deleteMany({ contentId: req.params.id, contentType: 'question' })
        ]);
        return res.json({ message: 'Question and associated content deleted' });
      case 'warn':
        question.status = 'open';
        // Implement user warning system here
        break;
      default:
        return res.status(400).json({ message: 'Invalid action' });
    }

    question.moderatorNote = `${question.moderatorNote}\nAdmin Note: ${adminNote}`;
    question.moderatedBy = req.user.id;
    question.moderatedAt = new Date();

    await question.save();

    // Update associated reports
    await Report.updateMany(
      { contentId: question._id, contentType: 'question', status: 'pending' },
      {
        status: 'reviewed',
        moderatedBy: req.user.id,
        moderatedAt: new Date(),
        moderatorNote: adminNote,
        actionTaken: action === 'warn' ? 'warning' : action === 'delete' ? 'content_removed' : 'none'
      }
    );

    res.json(question);
  } catch (err) {
    console.error('Error handling reported question:', err);
    res.status(500).json({ message: 'Error handling reported question' });
  }
});

// Get question moderation history
router.get('/questions/:id/history', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const reports = await Report.find({
      contentId: req.params.id,
      contentType: 'question'
    })
      .populate('reportedBy', 'name')
      .populate('moderatedBy', 'name')
      .sort({ createdAt: -1 });

    res.json(reports);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Fetch All Resolved Questions
router.get('/questions/resolved', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const resolvedQuestions = await Question.find({ status: 'resolved' })
      .populate('user', 'name')
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Question.countDocuments({ status: 'resolved' });

    res.json({
      questions: resolvedQuestions,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    });
  } catch (err) {
    console.error('Error fetching resolved questions:', err);
    res.status(500).json({ message: 'Error fetching resolved questions.' });
  }
});
// Delete Resolved Question by ID
router.delete('/questions/:id', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const questionId = req.params.id;

    // Check if the question exists and has the correct status
    const question = await Question.findById(questionId);
    if (!question || question.status !== 'resolved') {
      return res.status(404).json({ message: 'Resolved question not found.' });
    }

    // Delete the question
    const deletedQuestion = await Question.findByIdAndDelete(questionId);
    if (!deletedQuestion) {
      return res.status(404).json({ message: 'Question not found.' });
    }

    // Delete all associated answers
    await Answer.deleteMany({ question: questionId });

    // Send a successful response
    return res.status(200).json({ message: 'Question and its answers deleted successfully.' });
  } catch (err) {
    console.error('Error deleting resolved question:', err);

    // Catch unexpected errors and send a meaningful response
    if (err.name === 'CastError' && err.kind === 'ObjectId') {
      return res.status(400).json({ message: 'Invalid question ID format.' });
    }

    // Generic server error response
    return res.status(500).json({ message: 'An internal server error occurred while deleting the question.' });
  }
});

// Get all categories
router.get('/categories', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create new category
router.post('/categories', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const { name, description } = req.body;
    
    // Check if category already exists
    const existingCategory = await Category.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (existingCategory) {
      return res.status(400).json({ message: 'Category already exists' });
    }

    const category = new Category({
      name,
      description
    });

    const newCategory = await category.save();
    res.status(201).json(newCategory);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update category
router.put('/categories/:id', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const { name, description } = req.body;
    
    // Check if new name already exists (excluding current category)
    if (name) {
      const existingCategory = await Category.findOne({
        _id: { $ne: req.params.id },
        name: { $regex: new RegExp(`^${name}$`, 'i') }
      });
      if (existingCategory) {
        return res.status(400).json({ message: 'Category name already exists' });
      }
    }

    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    if (name) category.name = name;
    if (description) category.description = description;

    const updatedCategory = await category.save();
    res.json(updatedCategory);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete category
router.delete('/categories/:id', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // Check if category is in use
    const questionsUsingCategory = await Question.countDocuments({ category: category.name });
    if (questionsUsingCategory > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete category that is in use. Please reassign questions first.' 
      });
    }

    await category.deleteOne();
    res.json({ message: 'Category deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;