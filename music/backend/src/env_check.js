const path = require('path');
console.log('__dirname =', __dirname);
console.log('resolve ../.env =', path.resolve(__dirname, '../.env'));
const fs = require('fs');
console.log('exists =', fs.existsSync(path.resolve(__dirname, '../.env')));
try {
  console.log('contents =', fs.readFileSync(path.resolve(__dirname, '../.env'), 'utf8'));
} catch (err) {
  console.error(err);
}
