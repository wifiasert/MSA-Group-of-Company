const assert = require('assert');

process.env.PUBLIC_BASE_PATH = '/music/MSA_D';
delete require.cache[require.resolve('../server')];
const { normalizeRoutePathname, buildPublicPath } = require('../server');

assert.strictEqual(normalizeRoutePathname('/MSA_D/dashboard/upload/'), '/dashboard/upload/');
assert.strictEqual(normalizeRoutePathname('/music/MSA_D/dashboard/upload/'), '/dashboard/upload/');
assert.strictEqual(normalizeRoutePathname('/MSA_D/'), '/');
assert.strictEqual(buildPublicPath('/MSA_D/dashboard/', '/login.html'), '/MSA_D/login.html');
assert.strictEqual(buildPublicPath('/music/MSA_D/dashboard/', '/login.html'), '/music/MSA_D/login.html');
assert.strictEqual(buildPublicPath('/', '/login.html'), '/music/MSA_D/login.html');
console.log('route helpers verified');
