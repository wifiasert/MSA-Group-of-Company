const Release = require('../models/Release');
const Withdrawal = require('../models/Withdrawal');
const { successResponse } = require('../utilities/responseUtil');

const getArtistDashboard = async (req, res) => {
  const releases = await Release.find({ artist: req.user._id });
  const totalReleases = releases.length;
  const totalStreams = releases.reduce((sum, release) => sum + (release.streams || 0), 0);
  const totalRevenue = releases.reduce((sum, release) => sum + (release.revenue || 0), 0);
  const pendingReleases = releases.filter((release) => release.status === 'Submitted').length;
  const withdrawals = await Withdrawal.find({ artist: req.user._id });

  return successResponse(res, {
    dashboard: {
      totalReleases,
      totalStreams,
      totalRevenue,
      pendingReleases,
      withdrawalRequests: withdrawals.length
    }
  }, 'Artist dashboard loaded');
};

const getArtistProfile = async (req, res) => {
  return successResponse(res, { profile: req.user }, 'Artist profile loaded');
};

module.exports = { getArtistDashboard, getArtistProfile };
