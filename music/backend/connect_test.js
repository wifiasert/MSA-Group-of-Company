const http = require('http');
const host = process.env.BACKEND_HOST;
const port = Number(process.env.BACKEND_PORT || 4000);
if (!host) {
  throw new Error('BACKEND_HOST environment variable is required for connect_test.js');
}
const options = {
  hostname: host,
  port,
  path: '/api/health',
  method: 'GET',
};
const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => { console.log('status', res.statusCode); console.log('body', data); });
});
req.on('error', (err) => { console.error('error', err.message); });
req.end();
