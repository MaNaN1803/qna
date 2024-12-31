const express = require('express');
const Answer = require('../models/Answer');
const Question = require('../models/Question');
const authMiddleware = require('../middlewares/authMiddleware');
const router = express.Router();

// Add an Answer
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { content, questionId } = req.body;
    const answer = new Answer({
      content,
      question: questionId,
      user: req.user.id,
    });
    await answer.save();

    // Update question with answer count
    await Question.findByIdAndUpdate(questionId, { $inc: { answersCount: 1 } });

    res.status(201).json(answer);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Get Answers for a Question
router.get('/:questionId', async (req, res) => {
  try {
    const answers = await Answer.find({ question: req.params.questionId })
      .populate('user', 'name')
      .sort({ createdAt: -1 }); // Show latest answers first
    res.json(answers);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Vote on an Answer
router.put('/:id/vote', authMiddleware, async (req, res) => {
  try {
    const { vote } = req.body; // "up" or "down"
    const increment = vote === 'up' ? 1 : -1;

    const answer = await Answer.findById(req.params.id);
    if (!answer) return res.status(404).send('Answer not found');

    const existingVote = answer.voters.find(v => v.user.toString() === req.user.id);

    if (existingVote) {
      if (existingVote.vote === increment) {
        return res.status(400).json({ message: 'You have already voted' });
      }
      // Update existing vote
      existingVote.vote = increment;
    } else {
      // Add new vote
      answer.voters.push({ user: req.user.id, vote: increment });
    }

    // Calculate net votes
    answer.votes = answer.voters.reduce((sum, v) => sum + v.vote, 0);
    await answer.save();

    res.json(answer);
  } catch (err) {
    res.status(500).send(err.message);
  }
});


router.get('/user', authMiddleware, async (req, res) => {
  try {
    const answers = await Answer.find({ user: req.user.id }).populate('question', 'title');
    res.json(answers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/answers - Get Answers with optional user filter
router.get('/', async (req, res) => {
  try {
    const { userId } = req.query;
    const filter = userId ? { user: userId } : {};
    
    const answers = await Answer.find(filter)
      .populate('question', 'title')
      .populate('user', 'name')
      .sort({ createdAt: -1 });
    res.json(answers);
  } catch (err) {
    console.error('Error fetching answers:', err);
    res.status(500).send('Server error');
  }
});



module.exports = router;
