const express = require('express');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Sign Up
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already in use. Please try another one.' });
    }

    // Check if password exists in request
    if (!password) {
      return res.status(400).json({ message: 'Password is required' });
    }

    console.log("Raw password received:", password); // Debug log

    // Create user without hashing password here
    const user = new User({ name, email, password });

    await user.save();
    res.status(201).json({ message: 'User created successfully.' });
  } catch (err) {
    console.error("Signup Error:", err.message);
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found. Please check your email.' });
    }

    console.log("Entered password:", password); // Debug log
    console.log("Stored (hashed) password:", user.password); // Debug log

    // Check if password matches
    const isMatch = await bcrypt.compare(password, user.password);
    console.log("Password Match Status:", isMatch); // Debug log

    if (!isMatch) {
      return res.status(400).json({ message: 'Incorrect password. Please try again.' });
    }

    // Generate JWT token
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: '1d',
    });

    res.json({ token });
  } catch (err) {
    console.error("Login Error:", err.message);
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

// Get User Profile
router.get('/profile', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Authorization token missing.' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found.' });

    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update Profile
// Update Profile
router.put('/profile', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Authorization token missing.' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;

    const updateData = {};

    if (req.body.name) updateData.name = req.body.name;
    if (req.body.email) updateData.email = req.body.email;
    if (req.body.password) {
      const hashedPassword = await bcrypt.hash(req.body.password, 10);
      updateData.password = hashedPassword;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: 'No valid fields to update.' });
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true,
    }).select('-password');

    if (!updatedUser) return res.status(404).json({ message: 'User not found.' });

    res.json({ message: 'Profile updated successfully.', user: updatedUser });
  } catch (err) {
    console.error('Error updating profile:', err.message);
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
