// In your routes/reportRoutes.js
const express = require('express');
const Report = require('../models/Report');
const authMiddleware = require('../middlewares/authMiddleware');
const router = express.Router();

// POST /api/reports - Create a new report
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { contentId, contentType, reason, details } = req.body;
    const report = new Report({
      contentId,
      contentType,
      reason,
      details,
      reportedBy: req.user.id,
    });
    await report.save();
    res.status(201).json(report);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;