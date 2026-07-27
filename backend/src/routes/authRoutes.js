const express = require('express');
const { body } = require('express-validator');
const { register, login, refreshToken, logout } = require('../controllers/authController');

const router = express.Router();

router.post(
  '/register',
  body('name').trim().notEmpty(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('role').isIn(['Artist', 'Administrator']),
  register
);

router.post(
  '/login',
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  login
);

router.post('/refresh', body('refreshToken').notEmpty(), refreshToken);
router.post('/logout', logout);

module.exports = router;
