const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const { createTicket, getTickets, getTicketById, addTicketMessage } = require('../controllers/supportController');

const router = express.Router();

router.use(authMiddleware);
router.post('/', createTicket);
router.get('/', getTickets);
router.get('/:id', getTicketById);
router.post('/:id/messages', addTicketMessage);

module.exports = router;
