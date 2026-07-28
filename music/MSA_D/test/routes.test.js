const assert = require('assert');
const { normalizeRoutePathname, buildPublicPath } = require('../server');

assert.strictEqual(normalizeRoutePathname('/music/MSA_D/dashboard/upload/'), '/dashboard/upload/');
assert.strictEqual(normalizeRoutePathname('/music/MSA_D/'), '/');
assert.strictEqual(buildPublicPath('/music/MSA_D/dashboard/', '/login.html'), '/music/MSA_D/login.html');
assert.strictEqual(buildPublicPath('/', '/login.html'), '/music/MSA_D/login.html');
console.log('route helpers verified');
