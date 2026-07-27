const Release = require('../models/Release');
const Withdrawal = require('../models/Withdrawal');
const Analytics = require('../models/Analytics');
const { successResponse } = require('../utilities/responseUtil');

const getArtistAnalytics = async (req, res) => {
  const summary = await Analytics.findOne({ artist: req.user._id });
  if (summary) {
    return successResponse(res, { analytics: summary }, 'Analytics loaded');
  }

  const releases = await Release.find({ artist: req.user._id });
  const streams = releases.reduce((sum, release) => sum + (release.streams || 0), 0);
  const revenue = releases.reduce((sum, release) => sum + (release.revenue || 0), 0);
  const breakdown = releases.map((release) => ({ label: release.title, value: release.streams || 0 }));

  return successResponse(res, { analytics: { artist: req.user._id, streams, revenue, breakdown } }, 'Analytics loaded');
};

const getPlatformAnalytics = async (req, res) => {
  const releases = await Release.find();
  const totalStreams = releases.reduce((sum, release) => sum + (release.streams || 0), 0);
  const totalRevenue = releases.reduce((sum, release) => sum + (release.revenue || 0), 0);
  const activeArtists = await Release.distinct('artist').then((ids) => ids.length);

  return successResponse(res, { analytics: { totalStreams, totalRevenue, activeArtists } }, 'Platform analytics loaded');
};

const getWithdrawalSummary = async (req, res) => {
  const withdrawals = await Withdrawal.find({ artist: req.user._id });
  const totalRequested = withdrawals.reduce((sum, withdrawal) => sum + withdrawal.amount, 0);
  const totalApproved = withdrawals.filter((w) => w.status === 'Approved' || w.status === 'Completed').reduce((sum, w) => sum + w.amount, 0);
  return successResponse(res, { summary: { totalRequested, totalApproved, count: withdrawals.length } }, 'Withdrawal summary loaded');
};

module.exports = { getArtistAnalytics, getPlatformAnalytics, getWithdrawalSummary };
