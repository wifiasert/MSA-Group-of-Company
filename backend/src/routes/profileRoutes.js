const express = require('express');
const { body } = require('express-validator');
const { authMiddleware } = require('../middleware/authMiddleware');
const upload = require('../uploads/multerConfig');
const {
  getProfile,
  updateProfile,
  uploadProfilePhoto,
  getPaymentMethods,
  addPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod
} = require('../controllers/profileController');

const router = express.Router();

router.use(authMiddleware);
router.get('/', getProfile);
router.put('/',
  body('name').optional().trim().notEmpty(),
  body('phone').optional().trim(),
  body('country').optional().trim(),
  body('city').optional().trim(),
  updateProfile
);
router.post('/photo', upload.single('profilePhoto'), uploadProfilePhoto);
router.get('/payment-methods', getPaymentMethods);
router.post('/payment-methods',
  body('type').isIn(['Bank Transfer', 'Mobile Money', 'PayPal']),
  body('accountName').trim().notEmpty(),
  body('bankName').if(body('type').equals('Bank Transfer')).trim().notEmpty(),
  body('accountNumber').if(body('type').equals('Bank Transfer')).trim().notEmpty(),
  body('swiftCode').if(body('type').equals('Bank Transfer')).trim().notEmpty(),
  body('provider').if(body('type').equals('Mobile Money')).trim().notEmpty(),
  body('mobileNumber').if(body('type').equals('Mobile Money')).trim().notEmpty(),
  body('paypalEmail').if(body('type').equals('PayPal')).isEmail().normalizeEmail(),
  addPaymentMethod
);
router.put('/payment-methods/:id', updatePaymentMethod);
router.delete('/payment-methods/:id', deletePaymentMethod);

module.exports = router;
