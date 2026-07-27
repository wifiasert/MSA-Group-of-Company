const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const { getPaymentMethods, addPaymentMethod, updatePaymentMethod, deletePaymentMethod } = require('../controllers/paymentController');

const router = express.Router();

router.use(authMiddleware);
router.get('/', getPaymentMethods);
router.post('/', addPaymentMethod);
router.put('/:id', updatePaymentMethod);
router.delete('/:id', deletePaymentMethod);

module.exports = router;
