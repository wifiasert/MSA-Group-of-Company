const express = require('express');
const { authMiddleware, authorize } = require('../middleware/authMiddleware');
const { createWithdrawalRequest, getArtistWithdrawals, getAllWithdrawals, updateWithdrawalStatus } = require('../controllers/withdrawalController');

const router = express.Router();

router.use(authMiddleware);
router.post('/', authorize('Artist'), createWithdrawalRequest);
router.get('/', authorize('Artist'), getArtistWithdrawals);
router.get('/admin', authorize('Administrator'), getAllWithdrawals);
router.put('/:id/status', authorize('Administrator'), updateWithdrawalStatus);

module.exports = router;
