const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  role: {
    type: String,
    default: 'user',
    enum: ['user', 'moderator', 'admin', 'superAdmin'],
  },
  status: {
    type: String,
    default: 'active',
    enum: ['active', 'suspended', 'banned']
  },
  reputation: { type: Number, default: 0 },
  lastLogin: { type: Date },
  loginAttempts: { type: Number, default: 0 },
  isSuspended: { type: Boolean, default: false },
  suspensionReason: { type: String },
  suspensionExpiry: { type: Date },
  moderationHistory: [{
    action: { type: String, enum: ['warning', 'suspension', 'ban'] },
    reason: { type: String },
    moderatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    date: { type: Date, default: Date.now }
  }],
  permissions: [{
    type: String,
    enum: [
      'manage_users',
      'manage_content',
      'manage_reports',
      'view_analytics',
      'edit_settings'
    ]
  }]
}, {
  timestamps: true
});

UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

UserSchema.methods.checkPermission = function(permission) {
  return this.permissions.includes(permission) || 
         this.role === 'admin' || 
         this.role === 'superAdmin';
};

module.exports = mongoose.model('User', UserSchema);