const mongoose = require('mongoose');

const paymentMethodSchema = new mongoose.Schema({
  artist: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, required: true, enum: ['Bank Transfer', 'Mobile Money', 'PayPal'] },
  bankName: { type: String },
  accountName: { type: String, required: true },
  accountNumber: { type: String },
  swiftCode: { type: String },
  provider: { type: String },
  mobileNumber: { type: String },
  paypalEmail: { type: String },
  isDefault: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('PaymentMethod', paymentMethodSchema);
