const http = require('http');

function request(host, port, path, method='GET', headers={}, body=null) {
  return new Promise((resolve, reject) => {
    const opts = { hostname: host, port, path, method, headers };
    const req = http.request(opts, (res) => {
      let d=''; res.on('data', c=>d+=c); res.on('end', ()=>resolve({statusCode: res.statusCode, headers: res.headers, body: d}));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

(async ()=>{
  try{
    const host = process.env.FRONTEND_HOST;
    const frontendPort = Number(process.env.FRONTEND_PORT || 3000);
    const backendPort = Number(process.env.BACKEND_PORT || 4000);
    if (!host) {
      throw new Error('FRONTEND_HOST environment variable is required for auth_debug.js');
    }
    const ts = Date.now();
    const email = `debug+${ts}@example.com`;
    const pw='password123';
    const regBody=JSON.stringify({name:'Debug', email, password: pw, role: 'Artist'});
    console.log('Register via frontend...');
    const reg = await request(host, frontendPort, '/api/auth/register', 'POST', {'Content-Type':'application/json','Content-Length':Buffer.byteLength(regBody)}, regBody);
    console.log('Frontend register:', reg.statusCode, reg.body);

    console.log('Login via frontend...');
    const loginBody=JSON.stringify({email, password: pw});
    const login = await request(host, frontendPort, '/api/auth/login', 'POST', {'Content-Type':'application/json','Content-Length':Buffer.byteLength(loginBody)}, loginBody);
    console.log('Frontend login:', login.statusCode, login.body);
    let token=null;
    try{ const parsed=JSON.parse(login.body); token=parsed.tokens && parsed.tokens.accessToken; }catch(e){}
    if (!token) return console.error('No token from frontend');

    console.log('\nCall backend directly with token...');
    const direct = await request(host, backendPort, '/api/releases', 'GET', {'Authorization':'Bearer '+token});
    console.log('Backend direct:', direct.statusCode, direct.body);

    console.log('\nCall frontend proxy with token...');
    const prox = await request(host, frontendPort, '/api/releases', 'GET', {'Authorization':'Bearer '+token});
    console.log('Frontend proxied:', prox.statusCode, prox.body);
  }catch(e){ console.error('ERR', e); }
})();
