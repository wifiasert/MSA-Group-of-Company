const User = require('../models/User');
const Release = require('../models/Release');
const Withdrawal = require('../models/Withdrawal');
const SupportTicket = require('../models/SupportTicket');
const { successResponse } = require('../utilities/responseUtil');

const getDashboard = async (req, res) => {
  const totalArtists = await User.countDocuments({ role: 'Artist' });
  const totalReleases = await Release.countDocuments();
  const pendingReleases = await Release.countDocuments({ status: 'Submitted' });
  const pendingWithdrawals = await Withdrawal.countDocuments({ status: 'Pending' });

  return successResponse(res, {
    metrics: {
      totalArtists,
      totalReleases,
      pendingReleases,
      pendingWithdrawals
    }
  }, 'Admin dashboard loaded');
};

const getArtists = async (req, res) => {
  const artists = await User.find({ role: 'Artist' }).select('-password');
  return successResponse(res, { artists }, 'Artists loaded');
};

const getArtistById = async (req, res) => {
  const artist = await User.findById(req.params.id).select('-password');
  return successResponse(res, { artist }, 'Artist loaded');
};

const getSupportTickets = async (req, res) => {
  const tickets = await SupportTicket.find().populate('artist', 'name email').sort({ updatedAt: -1 });
  return successResponse(res, { tickets }, 'Support tickets loaded');
};

const getWithdrawals = async (req, res) => {
  const withdrawals = await Withdrawal.find().populate('artist', 'name email').sort({ requestedAt: -1 });
  return successResponse(res, { withdrawals }, 'Withdrawal requests loaded');
};

module.exports = { getDashboard, getArtists, getArtistById, getSupportTickets, getWithdrawals };
