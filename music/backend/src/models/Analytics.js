const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  artist: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  streams: { type: Number, default: 0 },
  revenue: { type: Number, default: 0 },
  breakdown: [{ label: String, value: Number }],
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Analytics', analyticsSchema);
