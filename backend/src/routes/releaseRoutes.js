const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const { authMiddleware } = require('../middleware/authMiddleware');
const {
  createDraftRelease,
  updateDraftRelease,
  submitRelease,
  getUserReleases,
  getReleaseById
} = require('../controllers/releaseController');

const router = express.Router();

router.use(authMiddleware);
router.get('/', asyncHandler(getUserReleases));
router.get('/:id', asyncHandler(getReleaseById));
router.post('/drafts', asyncHandler(createDraftRelease));
router.put('/drafts/:id', asyncHandler(updateDraftRelease));
router.post('/drafts/:id/submit', asyncHandler(submitRelease));

module.exports = router;
