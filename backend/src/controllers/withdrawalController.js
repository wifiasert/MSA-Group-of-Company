const Withdrawal = require('../models/Withdrawal');
const PaymentMethod = require('../models/PaymentMethod');
const { successResponse, errorResponse } = require('../utilities/responseUtil');

const createWithdrawalRequest = async (req, res) => {
  const { amount, paymentMethod } = req.body;

  if (!amount || amount <= 0) {
    return errorResponse(res, 'Valid withdrawal amount is required', 422);
  }

  const method = await PaymentMethod.findOne({ _id: paymentMethod, artist: req.user._id });
  if (!method) {
    return errorResponse(res, 'Payment method not found', 404);
  }

  const withdrawal = await Withdrawal.create({
    artist: req.user._id,
    amount,
    paymentMethod: method.type,
    requestedAt: new Date()
  });

  return successResponse(res, { withdrawal }, 'Withdrawal request created', 201);
};

const getArtistWithdrawals = async (req, res) => {
  const withdrawals = await Withdrawal.find({ artist: req.user._id }).sort({ requestedAt: -1 });
  return successResponse(res, { withdrawals }, 'Withdrawal history loaded');
};

const getAllWithdrawals = async (req, res) => {
  const withdrawals = await Withdrawal.find().populate('artist', 'name email').sort({ requestedAt: -1 });
  return successResponse(res, { withdrawals }, 'All withdrawals loaded');
};

const updateWithdrawalStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['Pending', 'Approved', 'Rejected', 'Completed'].includes(status)) {
    return errorResponse(res, 'Invalid withdrawal status', 400);
  }

  const withdrawal = await Withdrawal.findById(id);
  if (!withdrawal) return errorResponse(res, 'Withdrawal request not found', 404);

  withdrawal.status = status;
  if (status === 'Approved' || status === 'Completed') {
    withdrawal.processedAt = new Date();
  }

  await withdrawal.save();
  return successResponse(res, { withdrawal }, 'Withdrawal status updated');
};

module.exports = { createWithdrawalRequest, getArtistWithdrawals, getAllWithdrawals, updateWithdrawalStatus };
