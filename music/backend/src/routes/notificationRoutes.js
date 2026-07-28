const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const { getNotifications, markNotificationRead } = require('../controllers/notificationController');

const router = express.Router();

router.use(authMiddleware);
router.get('/', getNotifications);
router.put('/:id/read', markNotificationRead);

module.exports = router;
