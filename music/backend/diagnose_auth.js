const http = require('http');
const makeRequest = (options, body = null) => {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
};

(async () => {
  try {
    const email = `diagnose+${Date.now()}@example.com`;
    const registerBody = JSON.stringify({ name: 'DiagnoseUser', email, password: 'password123', role: 'Artist' });
    const host = process.env.BACKEND_HOST;
    const port = Number(process.env.BACKEND_PORT || 4000);
    if (!host) {
      throw new Error('BACKEND_HOST environment variable is required for diagnose_auth.js');
    }
    const register = await makeRequest({ hostname: host, port, path: '/api/auth/register', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(registerBody) } }, registerBody);
    console.log('REGISTER', register.statusCode, register.body);

    const loginBody = JSON.stringify({ email, password: 'password123' });
    const login = await makeRequest({ hostname: host, port, path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(loginBody) } }, loginBody);
    console.log('LOGIN', login.statusCode, login.body);

    const loginJson = JSON.parse(login.body || '{}');
    const token = loginJson.data?.tokens?.accessToken;
    console.log('TOKEN', token ? token.slice(0, 40) + '...' : 'NONE');
    if (!token) return;

    const releases = await makeRequest({ hostname: host, port, path: '/api/releases', method: 'GET', headers: { Authorization: 'Bearer ' + token } });
    console.log('RELEASES', releases.statusCode, releases.headers, releases.body);
  } catch (error) {
    console.error('ERROR', error);
  }
})();
