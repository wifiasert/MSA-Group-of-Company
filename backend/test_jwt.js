const dotenv = require('dotenv');
const path = require('path');
const jwt = require('jsonwebtoken');
const envPath = path.resolve(__dirname, '.env');
console.log('envPath', envPath);
const result = dotenv.config({ path: envPath });
console.log('result', result.error ? result.error.message : 'ok');
console.log('JWT_SECRET', process.env.JWT_SECRET);
const token = jwt.sign({ sub: 'mem-1', role: 'Artist' }, process.env.JWT_SECRET, { expiresIn: '1d' });
console.log('token', token);
try {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  console.log('decoded', decoded);
} catch (error) {
  console.error('verify error', error.message);
}
