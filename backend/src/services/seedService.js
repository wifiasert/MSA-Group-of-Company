const bcrypt = require('bcrypt');
const User = require('../models/User');

const seedDefaultUsers = async () => {
  const accounts = [
    {
      name: 'Administrator',
      email: 'admin@msatunes.com',
      password: 'Admin@12345',
      role: 'Administrator'
    },
    {
      name: 'Artist',
      email: 'artist@msatunes.com',
      password: 'Artist@12345',
      role: 'Artist'
    }
  ];

  for (const account of accounts) {
    const existing = await User.findOne({ email: account.email });
    if (!existing) {
      const hashedPassword = await bcrypt.hash(account.password, 12);
      await User.create({ ...account, password: hashedPassword, verified: true });
      console.log(`Seeded default user: ${account.email}`);
    }
  }
};

module.exports = { seedDefaultUsers };
