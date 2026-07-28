const assert = require('assert');
const { normalizeRoutePathname, buildPublicPath } = require('../server');

assert.strictEqual(normalizeRoutePathname('/MSA_D/dashboard/upload/'), '/dashboard/upload/');
assert.strictEqual(normalizeRoutePathname('/MSA_D/'), '/');
assert.strictEqual(buildPublicPath('/MSA_D/dashboard/', '/login.html'), '/MSA_D/login.html');
assert.strictEqual(buildPublicPath('/', '/login.html'), '/MSA_D/login.html');
console.log('route helpers verified');
