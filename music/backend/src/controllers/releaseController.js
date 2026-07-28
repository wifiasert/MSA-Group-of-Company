const mongoose = require('mongoose');
const Release = require('../models/Release');
const DraftRelease = require('../models/DraftRelease');
const Notification = require('../models/Notification');
const { successResponse, errorResponse } = require('../utilities/responseUtil');

const isDbConnected = () => mongoose.connection.readyState === 1;

const createDraftRelease = async (req, res) => {
  if (!isDbConnected()) {
    return errorResponse(res, 'Cannot create draft release while database is unavailable', 503);
  }
  const payload = req.body;
  const draft = await DraftRelease.create({ ...payload, artist: req.user._id });
  return successResponse(res, { draft }, 'Draft release created', 201);
};

const updateDraftRelease = async (req, res) => {
  if (!isDbConnected()) {
    return errorResponse(res, 'Cannot update draft release while database is unavailable', 503);
  }

  const { id } = req.params;
  const draft = await DraftRelease.findOne({ _id: id, artist: req.user._id });
  if (!draft) return errorResponse(res, 'Draft release not found', 404);

  Object.assign(draft, req.body, { updatedAt: new Date() });
  await draft.save();
  return successResponse(res, { draft }, 'Draft release updated');
};

const submitRelease = async (req, res) => {
  if (!isDbConnected()) {
    return errorResponse(res, 'Cannot submit release while database is unavailable', 503);
  }

  const { id } = req.params;
  const draft = await DraftRelease.findOne({ _id: id, artist: req.user._id });
  if (!draft) return errorResponse(res, 'Draft release not found', 404);

  draft.status = 'Submitted';
  draft.updatedAt = new Date();
  await draft.save();

  const release = await Release.create({
    artist: req.user._id,
    title: draft.title,
    type: draft.type,
    version: draft.version,
    subtitle: draft.subtitle,
    primaryArtist: draft.primaryArtist,
    featuredArtists: draft.featuredArtists,
    remixer: draft.remixer,
    composer: draft.composer,
    songwriter: draft.songwriter,
    producer: draft.producer,
    publisher: draft.publisher,
    recordLabel: draft.recordLabel,
    copyrightHolder: draft.copyrightHolder,
    isrc: draft.isrc,
    upc: draft.upc,
    catalogNumber: draft.catalogNumber,
    releaseDate: draft.releaseDate,
    originalReleaseDate: draft.originalReleaseDate,
    preOrderDate: draft.preOrderDate,
    territories: draft.territories,
    lyrics: draft.lyrics,
    contributors: draft.contributors,
    publisherSplits: draft.publisherSplits,
    artworkFile: draft.artworkFile,
    distributionStores: draft.selectedStores,
    status: 'Submitted',
    tracks: draft.tracks
  });

  await Notification.create({
    user: req.user._id,
    title: 'Release submitted',
    message: `Your release ${release.title} has been submitted for review.`,
    category: 'Release'
  });

  return successResponse(res, { release }, 'Release submitted for review', 200);
};

const getUserReleases = async (req, res) => {
  if (!isDbConnected()) {
    return errorResponse(res, 'Cannot load releases while database is unavailable', 503);
  }

  const releases = await Release.find({ artist: req.user._id }).sort({ createdAt: -1 });
  return successResponse(res, { releases }, 'Releases loaded');
};

const getReleaseById = async (req, res) => {
  if (!isDbConnected()) {
    return errorResponse(res, 'Cannot load release while database is unavailable', 503);
  }

  const { id } = req.params;
  const release = await Release.findOne({ _id: id, artist: req.user._id });
  if (!release) return errorResponse(res, 'Release not found', 404);
  return successResponse(res, { release }, 'Release loaded');
};

const adminGetAllReleases = async (req, res) => {
  if (!isDbConnected()) {
    return errorResponse(res, 'Cannot load releases while database is unavailable', 503);
  }

  const { status } = req.query;
  const filter = status ? { status } : {};
  const releases = await Release.find(filter).sort({ createdAt: -1 });
  return successResponse(res, { releases }, 'All releases loaded');
};

const adminUpdateReleaseStatus = async (req, res) => {
  if (!isDbConnected()) {
    return errorResponse(res, 'Cannot update release while database is unavailable', 503);
  }

  const { id } = req.params;
  const { status, reviewNote } = req.body;
  const release = await Release.findById(id);
  if (!release) return errorResponse(res, 'Release not found', 404);

  if (!['Pending', 'Approved', 'Rejected', 'Live'].includes(status)) {
    return errorResponse(res, 'Invalid release status', 400);
  }

  release.status = status;
  release.updatedAt = new Date();
  await release.save();

  await Notification.create({
    user: release.artist,
    title: `Release ${status.toLowerCase()}`,
    message: `Your release ${release.title} has been ${status.toLowerCase()}. ${reviewNote || ''}`,
    category: 'Release'
  });

  return successResponse(res, { release }, 'Release status updated');
};

module.exports = {
  createDraftRelease,
  updateDraftRelease,
  submitRelease,
  getUserReleases,
  getReleaseById,
  adminGetAllReleases,
  adminUpdateReleaseStatus
};
