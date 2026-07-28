const path = require('path');
const dotenv = require('dotenv');
const envPath = path.resolve(__dirname, '../.env');
console.log('resolved env path:', envPath);
const result = dotenv.config({ path: envPath });
console.log('result:', result);
console.log('JWT_SECRET:', process.env.JWT_SECRET);
console.log('MONGO_URI:', process.env.MONGO_URI);
