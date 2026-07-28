const path = require('path');

const artworkMimeTypes = ['image/jpeg', 'image/png'];
const audioMimeTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/flac', 'audio/x-flac'];

const validateArtworkFile = (file) => {
  if (!file) return { valid: false, reason: 'No artwork file provided' };
  if (!artworkMimeTypes.includes(file.mimetype)) {
    return { valid: false, reason: 'Artwork must be JPG or PNG format' };
  }
  if (file.size > 10 * 1024 * 1024) {
    return { valid: false, reason: 'Artwork file size must be 10MB or less' };
  }

  const extension = path.extname(file.originalname).toLowerCase();
  const widthHeightMatch = file.originalname.match(/(\d+)x(\d+)/);
  if (!['.jpg', '.jpeg', '.png'].includes(extension)) {
    return { valid: false, reason: 'Artwork file extension must be JPG or PNG' };
  }

  return { valid: true };
};

const validateAudioFile = (file) => {
  if (!file) return { valid: false, reason: 'No audio file provided' };
  if (!audioMimeTypes.includes(file.mimetype)) {
    return { valid: false, reason: 'Unsupported audio format. Use MP3, WAV, or FLAC' };
  }
  if (file.size > 150 * 1024 * 1024) {
    return { valid: false, reason: 'Audio file size must be 150MB or less' };
  }
  return { valid: true };
};

module.exports = { validateArtworkFile, validateAudioFile };
