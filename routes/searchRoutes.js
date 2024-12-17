const express = require('express');
const Question = require('../models/Question');
const router = express.Router();

// Search Questions
router.get('/', async (req, res) => {
  try {
    const { q } = req.query; // `q` for query
    const questions = await Question.find({
      $text: { $search: q },
    });
    res.json(questions);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

module.exports = router;
