const express = require('express');
const { authMiddleware, authorize } = require('../middleware/authMiddleware');
const { getDashboard, getArtists, getArtistById, getSupportTickets, getWithdrawals } = require('../controllers/adminController');

const router = express.Router();

router.use(authMiddleware, authorize('Administrator'));
router.get('/dashboard', getDashboard);
router.get('/artists', getArtists);
router.get('/artists/:id', getArtistById);
router.get('/support-tickets', getSupportTickets);
router.get('/withdrawals', getWithdrawals);

module.exports = router;
