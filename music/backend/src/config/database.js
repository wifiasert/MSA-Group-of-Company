const mongoose = require('mongoose');

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('MONGO_URI is required in production.');
    }
    console.warn('MONGO_URI is not set in environment variables; skipping MongoDB connection.');
    return false;
  }

  try {
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB');
    return true;
  } catch (err) {
    if (process.env.NODE_ENV === 'production') {
      throw err;
    }
    console.warn('Could not connect to MongoDB:', err.message);
    return false;
  }
};

module.exports = connectDB;
