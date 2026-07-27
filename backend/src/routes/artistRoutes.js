const express = require('express');
const { authMiddleware, authorize } = require('../middleware/authMiddleware');
const { getArtistDashboard, getArtistProfile } = require('../controllers/artistController');

const router = express.Router();

router.use(authMiddleware, authorize('Artist'));
router.get('/dashboard', getArtistDashboard);
router.get('/profile', getArtistProfile);

module.exports = router;
