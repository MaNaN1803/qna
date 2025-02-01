const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Ensure the User model is imported

const authMiddleware = async (req, res, next) => {
  const token = req.header('Authorization')?.split(' ')[1]; // Extract the token
  if (!token) return res.status(401).json({ message: 'Access denied. No token provided.' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // Verify the token
    req.user = await User.findById(decoded.id).select('-password'); // Attach user to request
    if (!req.user) return res.status(404).json({ message: 'User not found.' });
    next();
  } catch (err) {
    console.error('Auth error:', err.message);
    res.status(403).json({ message: 'Invalid or expired token.' });
  }
};


module.exports = authMiddleware;
