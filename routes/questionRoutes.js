const express = require('express');
const multer = require('multer');
const Question = require('../models/Question');
const authMiddleware = require('../middlewares/authMiddleware');
const router = express.Router();

// POST /api/questions - Create a Question
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, description, category, gpsLocation, attempts, images } = req.body;

    const question = new Question({
      title,
      description,
      category,
      images,
      gpsLocation,
      attempts,
      user: req.user.id,
    });

    await question.save();
    res.status(201).json(question);
  } catch (err) {
    console.error('Error creating question:', err);
    res.status(500).send('Server error');
  }
});


// GET /api/questions/:id - Get Question by ID
router.get('/:id', async (req, res) => {
  try {
    const question = await Question.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    ).populate('user', 'name');

    if (!question) return res.status(404).send('Question not found');
    res.json(question);
  } catch (err) {
    console.error('Error fetching question:', err);
    res.status(500).send('Server error');
  }
});

// PUT /api/questions/:id/status - Update Question Status
router.put('/:id/status', authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    const question = await Question.findById(req.params.id);
    if (!question) return res.status(404).send('Question not found');

    question.status = status;
    await question.save();
    res.json(question);
  } catch (err) {
    res.status(500).send('Server error');
  }
});

// GET /api/questions/user - Get Questions by Logged-in User
router.get('/user', authMiddleware, async (req, res) => {
  try {
    console.log('Logged-in User ID:', req.user.id); // Debugging log
    const questions = await Question.find({ user: req.user.id });
    res.json(questions);
  } catch (err) {
    console.error('Error fetching user questions:', err); // Log the full error
    res.status(500).json({ message: 'Failed to fetch user questions', error: err.message });
  }
});

// GET /api/questions - Get Questions with optional filters
router.get('/', async (req, res) => {
  try {
    const { userId, category, search } = req.query;
    const filter = {};

    if (userId) filter.user = userId;
    if (category) filter.category = category;
    if (search) filter.$text = { $search: search };

    const questions = await Question.find(filter)
      .populate('user', 'name')
      .sort({ createdAt: -1 });
    res.json(questions);
  } catch (err) {
    console.error('Error fetching questions:', err);
    res.status(500).send('Server error');
  }
});


router.put('/:id/vote', authMiddleware, async (req, res) => {
  try {
    const { vote } = req.body; // "up" or "down"
    const increment = vote === 'up' ? 1 : -1;

    const question = await Question.findById(req.params.id);
    if (!question) return res.status(404).send('Question not found');

    const existingVote = question.voters.find(v => v.user.toString() === req.user.id);

    if (existingVote) {
      if (existingVote.vote === increment) {
        return res.status(400).json({ message: 'You have already voted' });
      }
      // Update existing vote
      existingVote.vote = increment;
    } else {
      // Add new vote
      question.voters.push({ user: req.user.id, vote: increment });
    }

    // Calculate net votes
    question.votes = question.voters.reduce((sum, v) => sum + v.vote, 0);
    await question.save();

    res.json(question);
  } catch (err) {
    console.error('Error voting on question:', err);
    res.status(500).send('Server error');
  }
});



module.exports = router;
