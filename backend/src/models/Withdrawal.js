const mongoose = require('mongoose');

const withdrawalSchema = new mongoose.Schema({
  artist: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected', 'Completed'], default: 'Pending' },
  paymentMethod: { type: String, required: true },
  requestedAt: { type: Date, default: Date.now },
  processedAt: { type: Date }
});

module.exports = mongoose.model('Withdrawal', withdrawalSchema);
