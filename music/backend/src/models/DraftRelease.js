const mongoose = require('mongoose');

const draftTrackSchema = new mongoose.Schema({
  title: { type: String, required: true },
  version: { type: String },
  featuredArtists: [{ type: String }],
  lyrics: { type: String },
  composer: { type: String },
  songwriter: { type: String },
  producer: { type: String },
  isrc: { type: String },
  genre: { type: String },
  language: { type: String },
  duration: { type: Number },
  audioFile: { type: String }
});

const draftReleaseSchema = new mongoose.Schema({
  artist: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  type: { type: String, required: true, enum: ['Single', 'EP', 'Album', 'Compilation'] },
  version: { type: String },
  subtitle: { type: String },
  primaryArtist: { type: String },
  featuredArtists: [{ type: String }],
  remixer: { type: String },
  composer: { type: String },
  songwriter: { type: String },
  producer: { type: String },
  publisher: { type: String },
  recordLabel: { type: String },
  copyrightHolder: { type: String },
  isrc: { type: String },
  upc: { type: String },
  catalogNumber: { type: String },
  releaseDate: { type: Date },
  originalReleaseDate: { type: Date },
  preOrderDate: { type: Date },
  territories: [{ type: String }],
  lyrics: { type: String },
  contributors: [{ type: String }],
  publisherSplits: [{ name: String, percentage: Number }],
  artworkFile: { type: String },
  selectedStores: [{ type: String }],
  distributeEverywhere: { type: Boolean, default: false },
  tracks: [draftTrackSchema],
  status: { type: String, enum: ['Draft', 'Submitted', 'Rejected'], default: 'Draft' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('DraftRelease', draftReleaseSchema);
