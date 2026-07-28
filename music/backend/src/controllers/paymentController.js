const PaymentMethod = require('../models/PaymentMethod');
const { successResponse, errorResponse } = require('../utilities/responseUtil');

const getPaymentMethods = async (req, res) => {
  const methods = await PaymentMethod.find({ artist: req.user._id }).sort({ isDefault: -1, createdAt: -1 });
  return successResponse(res, { paymentMethods: methods }, 'Payment methods loaded');
};

const addPaymentMethod = async (req, res) => {
  const {
    type,
    bankName,
    accountName,
    accountNumber,
    swiftCode,
    provider,
    mobileNumber,
    paypalEmail,
    isDefault
  } = req.body;

  if (isDefault) {
    await PaymentMethod.updateMany({ artist: req.user._id }, { isDefault: false });
  }

  const method = await PaymentMethod.create({
    artist: req.user._id,
    type,
    bankName,
    accountName,
    accountNumber,
    swiftCode,
    provider,
    mobileNumber,
    paypalEmail,
    isDefault: Boolean(isDefault)
  });

  return successResponse(res, { paymentMethod: method }, 'Payment method added', 201);
};

const updatePaymentMethod = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const method = await PaymentMethod.findOne({ _id: id, artist: req.user._id });
  if (!method) return errorResponse(res, 'Payment method not found', 404);

  if (updates.isDefault) {
    await PaymentMethod.updateMany({ artist: req.user._id }, { isDefault: false });
  }

  Object.assign(method, updates);
  await method.save();
  return successResponse(res, { paymentMethod: method }, 'Payment method updated');
};

const deletePaymentMethod = async (req, res) => {
  const { id } = req.params;
  const method = await PaymentMethod.findOneAndDelete({ _id: id, artist: req.user._id });
  if (!method) return errorResponse(res, 'Payment method not found', 404);

  const defaultExists = await PaymentMethod.exists({ artist: req.user._id, isDefault: true });
  if (!defaultExists) {
    const fallback = await PaymentMethod.findOne({ artist: req.user._id }).sort({ createdAt: -1 });
    if (fallback) {
      fallback.isDefault = true;
      await fallback.save();
    }
  }

  return successResponse(res, null, 'Payment method removed');
};

module.exports = { getPaymentMethods, addPaymentMethod, updatePaymentMethod, deletePaymentMethod };
