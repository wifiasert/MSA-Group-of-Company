const http = require('http');
const host = process.env.BACKEND_HOST;
const port = Number(process.env.BACKEND_PORT || 4000);
if (!host) {
  throw new Error('BACKEND_HOST environment variable is required for direct_backend_full_test.js');
}
const email = `debug+${Date.now()}@example.com`;
const pw = 'password123';

function request(path, method='GET', headers={}, body=null) {
  return new Promise((resolve, reject) => {
    const opts = { hostname: host, port, path, method, headers };
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

(async () => {
  try {
    const regBody = JSON.stringify({ name: 'DirectDebug', email, password: pw, role: 'Artist' });
    const reg = await request('/api/auth/register', 'POST', { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(regBody) }, regBody);
    console.log('register', reg.statusCode, reg.body);

    const loginBody = JSON.stringify({ email, password: pw });
    const login = await request('/api/auth/login', 'POST', { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(loginBody) }, loginBody);
    console.log('login', login.statusCode, login.body);
    const parsed = JSON.parse(login.body);
    const token = parsed.tokens && parsed.tokens.accessToken;
    console.log('direct token', token? token.slice(0,30)+'...' : 'none');
    if (!token) return;

    const releases = await request('/api/releases', 'GET', { Authorization: 'Bearer '+token });
    console.log('releases direct', releases.statusCode, releases.body);
  } catch (err) {
    console.error('error', err.message, err.stack);
  }
})();
