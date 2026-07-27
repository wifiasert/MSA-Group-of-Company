const express = require('express');
const { authMiddleware, authorize } = require('../middleware/authMiddleware');
const { getArtistAnalytics, getPlatformAnalytics, getWithdrawalSummary } = require('../controllers/analyticsController');

const router = express.Router();

router.use(authMiddleware);
router.get('/artist', authorize('Artist'), getArtistAnalytics);
router.get('/platform', authorize('Administrator'), getPlatformAnalytics);
router.get('/withdrawals', authorize('Artist'), getWithdrawalSummary);

module.exports = router;
