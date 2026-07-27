const http = require('http');

function request(opts, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

(async () => {
  try {
    const host = process.env.FRONTEND_HOST;
    const port = Number(process.env.FRONTEND_PORT || 3000);
    if (!host) {
      throw new Error('FRONTEND_HOST environment variable is required for e2e_auth.js');
    }
    const timestamp = Date.now();
    const email = `testuser+${timestamp}@example.com`;
    const password = 'password123';

    console.log('Registering:', email);
    const regBody = JSON.stringify({ name: 'E2E Tester', email, password, role: 'Artist' });
    const reg = await request({ hostname: host, port, path: '/api/auth/register', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(regBody) } }, regBody);
    console.log('REGISTER', reg.statusCode, reg.body);

    console.log('Logging in');
    const loginBody = JSON.stringify({ email, password });
    const login = await request({ hostname: host, port, path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(loginBody) } }, loginBody);
    console.log('LOGIN', login.statusCode, login.body);

    let accessToken;
    try {
      const loginData = JSON.parse(login.body);
      accessToken = loginData.tokens && loginData.tokens.accessToken;
    } catch (e) {}

    if (!accessToken) {
      console.error('No access token returned; aborting');
      process.exit(1);
    }

    console.log('Fetching protected /api/releases with access token');
    const releases = await request({ hostname: host, port, path: '/api/releases', method: 'GET', headers: { 'Authorization': 'Bearer ' + accessToken } });
    console.log('RELEASES', releases.statusCode, releases.body);
  } catch (err) {
    console.error('E2E ERROR', err);
    process.exit(1);
  }
})();
