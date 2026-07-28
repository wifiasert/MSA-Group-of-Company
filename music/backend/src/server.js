const path = require('path');
const dotenv = require('dotenv');
const envPath = path.resolve(__dirname, '../.env');
const envResult = dotenv.config({ path: envPath });
console.log('Loaded backend .env from', envPath, 'result=', envResult.error ? envResult.error.message : 'ok');
console.log('ENV MONGO_URI=', process.env.MONGO_URI);
console.log('ENV JWT_SECRET set=', Boolean(process.env.JWT_SECRET), 'length=', process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 0);
if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is required. Set it in backend/.env or the environment.');
  process.exit(1);
}
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/database');
const authRoutes = require('./routes/authRoutes');
const artistRoutes = require('./routes/artistRoutes');
const adminRoutes = require('./routes/adminRoutes');
const releaseRoutes = require('./routes/releaseRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const withdrawalRoutes = require('./routes/withdrawalRoutes');
const supportRoutes = require('./routes/supportRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const profileRoutes = require('./routes/profileRoutes');
const { errorHandler } = require('./middleware/errorHandler');
const { seedDefaultUsers } = require('./services/seedService');


const app = express();
const PORT = process.env.PORT || 4000;
const frontendOrigin = process.env.CORS_ORIGIN || '*';

app.use(helmet());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use(cors({ origin: frontendOrigin, credentials: true }));
app.use(morgan('combined'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false
});
app.use(limiter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', environment: process.env.NODE_ENV || 'development' });
});

app.use('/api/auth', authRoutes);
app.use('/api/artists', artistRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/releases', releaseRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/withdrawals', withdrawalRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/profile', profileRoutes);

app.use(errorHandler);

connectDB()
  .then((connected) => {
    if (connected) {
      return seedDefaultUsers();
    }
    return null;
  })
  .then(() => {
    app.listen(PORT, () => {
      console.log(`MSA Tune Studio backend running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Startup error:', error);
    process.exit(1);
  });
