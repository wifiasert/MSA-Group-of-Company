const SupportTicket = require('../models/SupportTicket');
const { successResponse, errorResponse } = require('../utilities/responseUtil');

const createTicket = async (req, res) => {
  const { subject, category, priority, message } = req.body;
  if (!subject || !category || !message) {
    return errorResponse(res, 'Subject, category, and message are required', 422);
  }

  const ticket = await SupportTicket.create({
    artist: req.user._id,
    subject,
    category,
    priority: priority || 'Medium',
    messages: [{ author: req.user._id, message }]
  });

  return successResponse(res, { ticket }, 'Support ticket created', 201);
};

const getTickets = async (req, res) => {
  const filter = req.user.role === 'Administrator' ? {} : { artist: req.user._id };
  const tickets = await SupportTicket.find(filter).populate('artist', 'name email').sort({ updatedAt: -1 });
  return successResponse(res, { tickets }, 'Support tickets loaded');
};

const getTicketById = async (req, res) => {
  const ticket = await SupportTicket.findById(req.params.id).populate('artist', 'name email');
  if (!ticket) return errorResponse(res, 'Support ticket not found', 404);
  if (req.user.role !== 'Administrator' && !ticket.artist._id.equals(req.user._id)) {
    return errorResponse(res, 'Forbidden', 403);
  }
  return successResponse(res, { ticket }, 'Support ticket loaded');
};

const addTicketMessage = async (req, res) => {
  const ticket = await SupportTicket.findById(req.params.id);
  if (!ticket) return errorResponse(res, 'Support ticket not found', 404);
  if (req.user.role !== 'Administrator' && !ticket.artist.equals(req.user._id)) {
    return errorResponse(res, 'Forbidden', 403);
  }

  const { message } = req.body;
  if (!message) return errorResponse(res, 'Message is required', 422);

  ticket.messages.push({ author: req.user._id, message });
  ticket.updatedAt = new Date();
  await ticket.save();
  return successResponse(res, { ticket }, 'Message added to support ticket');
};

module.exports = { createTicket, getTickets, getTicketById, addTicketMessage };
