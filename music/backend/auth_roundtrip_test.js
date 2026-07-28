const http = require('http');
const host = process.env.BACKEND_HOST || process.env.FRONTEND_HOST;
const frontendPort = Number(process.env.FRONTEND_PORT || 3000);
const backendPort = Number(process.env.BACKEND_PORT || 4000);
if (!host) {
  throw new Error('BACKEND_HOST or FRONTEND_HOST environment variable is required for auth_roundtrip_test.js');
}
const email = `debug+${Date.now()}@example.com`;
const pw = 'password123';
const payload = { name: 'Debug', email, password: pw, role: 'Artist' };

function request(port, path, method, headers = {}, body = null) {
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
    const body = JSON.stringify(payload);
    console.log('login via frontend');
    const reg = await request(frontendPort, '/api/auth/register', 'POST', {'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body)}, body);
    console.log('register status', reg.statusCode, reg.body);
    const loginBody = JSON.stringify({ email, password: pw });
    const login = await request(frontendPort, '/api/auth/login', 'POST', {'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(loginBody)}, loginBody);
    console.log('login status', login.statusCode, login.body);
    const parsed = JSON.parse(login.body);
    const token = parsed.tokens && parsed.tokens.accessToken;
    if (!token) return console.error('no token');
    console.log('token length', token.length);
    const direct = await request(backendPort, '/api/releases', 'GET', { Authorization: 'Bearer '+token });
    console.log('direct backend status', direct.statusCode, direct.body);
  } catch (err) {
    console.error('error', err);
  }
})();
