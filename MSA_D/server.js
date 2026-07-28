const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const jwt = require('jsonwebtoken');

const rootDir = __dirname;
const port = Number(process.env.PORT || 3000);
const PUBLIC_BASE_PATH = process.env.PUBLIC_BASE_PATH || '/MSA_D';
const fallbackBackendUrl = 'https://msa-tune-studio-backend.onrender.com';
const BACKEND_URL = process.env.BACKEND_URL || process.env.BACKEND || fallbackBackendUrl;
if (!process.env.BACKEND_URL && !process.env.BACKEND) {
  console.warn(`BACKEND_URL not set — using ${BACKEND_URL}`);
}
const backendUrl = new URL(BACKEND_URL);
const config = {
  dbName: process.env.DB_NAME || '',
  dbUser: process.env.DB_USERNAME || '',
  dbPassword: process.env.DB_PASSWORD || '',
  dbPort: process.env.DB_PORT || ''
};

const AUTH_COOKIE_NAME = 'msa_auth';

function parseCookies(cookieHeader) {
  if (!cookieHeader) return {};
  return cookieHeader.split(';').reduce((cookies, cookiePart) => {
    const [name, ...valueParts] = cookiePart.split('=');
    if (!name) return cookies;
    cookies[name.trim()] = decodeURIComponent(valueParts.join('=').trim());
    return cookies;
  }, {});
}

function getAuthCookie(req) {
  const cookies = parseCookies(req.headers.cookie);
  return cookies[AUTH_COOKIE_NAME] || null;
}

function getAuthHeaderForProxy(req) {
  const token = getAuthCookie(req);
  return token ? `Bearer ${token}` : null;
}

function verifyAuthToken(token) {
  if (!token || !process.env.JWT_SECRET) {
    return false;
  }
  try {
    jwt.verify(token, process.env.JWT_SECRET);
    return true;
  } catch (error) {
    return false;
  }
}

function buildCookieHeader(value, maxAgeSeconds = 24 * 60 * 60) {
  const isSecure = process.env.NODE_ENV === 'production';
  const props = [`Path=/`, `HttpOnly`, `SameSite=Lax`, `Max-Age=${maxAgeSeconds}`];
  if (isSecure) props.push('Secure');
  return `${AUTH_COOKIE_NAME}=${encodeURIComponent(value)}; ${props.join('; ')}`;
}

function buildClearCookieHeader() {
  const isSecure = process.env.NODE_ENV === 'production';
  const props = [`Path=/`, `HttpOnly`, `SameSite=Lax`, `Max-Age=0`, `Expires=Thu, 01 Jan 1970 00:00:00 GMT`];
  if (isSecure) props.push('Secure');
  return `${AUTH_COOKIE_NAME}=deleted; ${props.join('; ')}`;
}

const localApiPayloads = {
  '/api/dashboard': () => pagePayloads.dashboard,
  '/api/uploads': () => pagePayloads.upload,
  '/api/analytics': () => pagePayloads.analytics,
  '/api/revenue': () => pagePayloads.revenue,
  '/api/balance': () => pagePayloads.balance,
  '/api/messages': () => pagePayloads.messages,
  '/api/help': () => pagePayloads.help,
  '/api/settings': () => pagePayloads.settings
};

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function proxyApiRequest(req, res, backendPath, bodyBuffer, options = {}) {
  const protocol = backendUrl.protocol === 'https:' ? require('https') : require('http');
  const reqUrl = new URL(req.url, `http://${req.headers.host}`);
  const headers = { ...req.headers };
  delete headers.host;

  const forwardedAuthHeader = headers.authorization || headers.Authorization || null;
  const cookieAuthHeader = !forwardedAuthHeader && options.injectCookieAuth ? getAuthHeaderForProxy(req) : null;
  if (cookieAuthHeader) {
    headers.authorization = cookieAuthHeader;
  }

  console.log('[proxy] forward', req.method, backendPath + reqUrl.search, 'auth=', forwardedAuthHeader || cookieAuthHeader ? `${(forwardedAuthHeader || cookieAuthHeader).slice(0, 20)}...` : 'none');

  const requestOptions = {
    protocol: backendUrl.protocol,
    hostname: backendUrl.hostname,
    port: backendUrl.port,
    method: req.method,
    path: backendPath + reqUrl.search,
    headers
  };

  if (bodyBuffer) {
    requestOptions.headers['content-length'] = bodyBuffer.length;
  }

  const backendReq = protocol.request(requestOptions, (backendRes) => {
    const chunks = [];
    backendRes.on('data', (chunk) => chunks.push(chunk));
    backendRes.on('end', () => {
      const raw = Buffer.concat(chunks);
      const contentType = backendRes.headers['content-type'] || '';
      let body = raw;
      const responseHeaders = { ...backendRes.headers };
      let parsedResponse = null;

      if (contentType.includes('application/json')) {
        try {
          parsedResponse = JSON.parse(raw.toString('utf8'));
          if (parsedResponse && typeof parsedResponse === 'object' && Object.prototype.hasOwnProperty.call(parsedResponse, 'ok') && Object.prototype.hasOwnProperty.call(parsedResponse, 'data')) {
            body = Buffer.from(JSON.stringify(parsedResponse.data));
            responseHeaders['content-length'] = Buffer.byteLength(body);
          }
        } catch (err) {
          // leave raw body in place if JSON parse fails
        }
      }

      if (typeof options.responseModifier === 'function') {
        options.responseModifier(responseHeaders, parsedResponse, backendRes);
      }

      res.writeHead(backendRes.statusCode || 502, responseHeaders);
      res.end(body);
    });
  });

  backendReq.on('error', (error) => {
    console.log('[proxy] backend request error', backendPath, error.message);
    sendJson(res, 502, { error: 'Backend proxy error', message: error.message });
  });

  backendReq.on('response', (backendRes) => {
    console.log('[proxy] backend response', backendPath, backendRes.statusCode, 'content-type=', backendRes.headers['content-type']);
  });

  if (bodyBuffer) {
    backendReq.write(bodyBuffer);
  }
  backendReq.end();
}

function readJsonBody(req, cb) {
  let body = '';
  req.on('data', (chunk) => { body += chunk.toString(); });
  req.on('end', () => {
    try { cb(null, body ? JSON.parse(body) : {}); } catch (err) { cb(err); }
  });
}

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg'
};

const pagePayloads = {
  dashboard: {
    artist: {
      name: 'Ava Lane',
      bio: 'Independent artist focused on global digital releases and premium brand growth.',
      verification: 'Identity verification complete • 3 distributor integrations active',
      distributionStatus: 'Live'
    },
    metrics: {
      balance: 21340,
      pendingBalance: 4800,
      lifetimeEarnings: 182760,
      monthlyRevenue: 1368,
      revenue: 3800,
      streams: 94000,
      totalReleases: 6,
      singles: 3,
      albums: 1,
      eps: 2,
      scheduledReleases: 2,
      pendingReleases: 1,
      approvedReleases: 4,
      rejectedReleases: 0,
      liveReleases: 3,
      distributionStatus: 'Live'
    },
    releases: [
      { title: 'Midnight Echo', status: 'Approved', releaseDate: '2026-07-01' },
      { title: 'Neon Skyline', status: 'Draft', releaseDate: '2026-08-12' },
      { title: 'Golden Hour', status: 'Live', releaseDate: '2026-06-18' }
    ],
    activity: [
      { title: 'Release approved', time: '12 min ago', detail: 'Golden Hour passed review and moved to live distribution.' },
      { title: 'Payout scheduled', time: '1 hr ago', detail: 'A new settlement has been queued for the upcoming earnings cycle.' },
      { title: 'Artwork accepted', time: '3 hrs ago', detail: 'The latest cover art passed platform validation.' }
    ],
    notifications: [
      { title: 'System update', detail: 'Your latest metadata update is now synced across all storefronts.' },
      { title: 'Support reply', detail: 'Admin responded to the metadata review request.' }
    ],
    withdrawals: [
      { amount: 1500, status: 'Pending', date: '2026-07-25' },
      { amount: 2400, status: 'Approved', date: '2026-07-20' }
    ]
  },
  upload: {
    steps: [
      { title: 'Audio upload', detail: 'Validate the master, stems, and preview audio file.' },
      { title: 'Artwork review', detail: 'Confirm the cover art meets platform spec and localization needs.' },
      { title: 'Metadata completion', detail: 'Populate rights, contributors, and publishing fields.' },
      { title: 'Distribution review', detail: 'Check territories, dates, and release scheduling.' }
    ],
    fields: ['Release Type', 'Version', 'Subtitle', 'Primary Artist', 'Featured Artists', 'Remixer', 'Composer', 'Songwriter', 'Producer', 'Publisher', 'Record Label', 'Copyright Holder', 'Producer Credits', 'Mix Engineer', 'Mastering Engineer', 'Genre', 'Mood', 'Language', 'Explicit Content', 'Instrumental', 'BPM', 'Musical Key', 'ISRC', 'UPC', 'Catalog Number', 'Release Date', 'Original Release Date', 'Pre-order Date', 'Territories', 'Lyrics', 'Contributors', 'Writer Splits', 'Publishing Splits', 'Artwork Upload', 'Artwork Validation', 'Audio Upload', 'Audio Validation', 'Lossless Audio Validation', 'Preview Player', 'Track Duration', 'Track Number', 'Disc Number', 'Copyright Notice', 'Publishing Notice', 'Distribution Notes', 'Internal Notes'],
    summary: 'Prepare metadata, artwork, and audio for global distribution.',
    progress: 78
  },
  releases: {
    releases: [
      { artwork: 'Cover', title: 'Midnight Echo', artist: 'Ava Lane', releaseDate: '2026-07-01', genre: 'Afrobeats', status: 'Approved', revenue: 2400, streams: 94000 },
      { artwork: 'Cover', title: 'Neon Skyline', artist: 'Ava Lane', releaseDate: '2026-08-12', genre: 'Alternative', status: 'Draft', revenue: 0, streams: 0 },
      { artwork: 'Cover', title: 'Golden Hour', artist: 'Ava Lane', releaseDate: '2026-06-18', genre: 'Afro House', status: 'Live', revenue: 1800, streams: 32000 },
      { artwork: 'Cover', title: 'Velvet Rain', artist: 'Ava Lane', releaseDate: '2026-05-14', genre: 'R&B', status: 'Pending', revenue: 850, streams: 18000 }
    ]
  },
  analytics: {
    series: [42, 54, 63, 72, 80, 96, 104],
    topTracks: [
      { title: 'Midnight Echo', metric: '94k streams', growth: '+24% growth' },
      { title: 'Golden Hour', metric: '32k streams', growth: '+18% growth' },
      { title: 'Velvet Rain', metric: '18k streams', growth: '+12% growth' }
    ],
    countries: [
      { country: 'United States', streams: 28400, revenue: 1420 },
      { country: 'United Kingdom', streams: 19200, revenue: 980 },
      { country: 'Ghana', streams: 16700, revenue: 760 }
    ],
    platforms: [
      { name: 'Spotify', value: 61200, revenue: 1840 },
      { name: 'Apple Music', value: 21400, revenue: 980 },
      { name: 'YouTube Music', value: 15800, revenue: 740 }
    ]
  },
  revenue: {
    summary: {
      balance: 21340,
      pendingBalance: 4800,
      monthlyRevenue: 1368,
      lifetimeRevenue: 182760
    },
    byRelease: [
      { title: 'Midnight Echo', revenue: 2400, streams: 94000 },
      { title: 'Golden Hour', revenue: 1800, streams: 32000 },
      { title: 'Velvet Rain', revenue: 850, streams: 18000 }
    ],
    history: [
      { period: 'Last 7 days', amount: 420 },
      { period: 'Last 30 days', amount: 1368 },
      { period: 'Last 90 days', amount: 3800 }
    ],
    transactions: [
      { date: '2026-07-24', type: 'Streaming', source: 'Spotify', status: 'Completed', amount: 560 },
      { date: '2026-07-21', type: 'Publishing', source: 'YouTube Music', status: 'Pending', amount: 320 },
      { date: '2026-07-16', type: 'Distribution', source: 'Apple Music', status: 'Completed', amount: 240 }
    ]
    ,
    pendingWithdrawals: [
      { reference: 'W-2048', amount: 2400, status: 'Pending', date: '2026-07-25' }
    ],
    approvedWithdrawals: [
      { reference: 'W-2032', amount: 1500, status: 'Approved', date: '2026-07-20' }
    ],
    rejectedWithdrawals: [],
    completedWithdrawals: [
      { reference: 'W-2020', amount: 1500, status: 'Completed', date: '2026-06-20' }
    ],
    defaultPaymentMethod: { method: 'Bank Transfer', account: 'HSBC • 01234567' }
  },
  balance: {
    balances: [
      { label: 'Current balance', value: '$21,340', note: 'Live artist wallet' },
      { label: 'Pending balance', value: '$4,800', note: 'Awaiting payout' },
      { label: 'Lifetime earnings', value: '$182,760', note: 'All time' }
    ],
    ledger: [
      { title: 'Streaming payout', detail: 'Received on 2026-07-20' },
      { title: 'Distribution advance', detail: 'Scheduled for 2026-08-01' },
      { title: 'Publishing settlement', detail: 'Delivered on 2026-06-30' }
    ]
  },
  withdrawals: {
    history: [
      { amount: '$1,500', status: 'Completed', date: '2026-06-20' },
      { amount: '$2,400', status: 'Pending', date: '2026-07-25' }
    ],
    historyDetailed: [
      { date: '2026-06-20', amount: '$1,500', status: 'Completed', processing: 'Processed in 24 hrs' },
      { date: '2026-07-25', amount: '$2,400', status: 'Pending', processing: 'Expected within 48 hrs' }
    ]
  },
  support: {
    tickets: [
      { number: 'T-2048', category: 'Metadata', priority: 'High', status: 'Open' },
      { number: 'T-2044', category: 'Payments', priority: 'Medium', status: 'Resolved' }
    ],
    conversation: [
      { author: 'Admin', message: 'Your artwork and metadata are approved. We are preparing the next release review.' },
      { author: 'Artist', message: 'Thank you. Please confirm if the publishing notice is visible on all storefronts.' }
    ]
  },
  messages: {
    threads: [
      { author: 'Admin', preview: 'Your latest release looks strong and is advancing.' },
      { author: 'Artist', preview: 'I have updated the cover art and release date.' }
    ],
    threadNote: 'Release review',
    threadDetail: 'Latest updates are shared here with clear status context for your next release.'
  },
  notifications: {
    items: [
      { title: 'Release approved', detail: 'Golden Hour passed review and is now live.', category: 'Release' },
      { title: 'Withdrawal request received', detail: 'A new payout request is waiting for approval.', category: 'Finance' },
      { title: 'System update', detail: 'Your release schedule has been synced to the platform calendar.', category: 'System' }
    ]
  },
  profile: {
    name: 'Ava Lane',
    stageName: 'Ava Lane',
    email: 'ava@msa.company',
    phone: '+233 55 123 4567',
    country: 'Ghana',
    city: 'Accra',
    biography: 'Independent artist building a global catalog with premium release and royalty management.',
    bankDetails: 'HSBC • 01234567',
    taxInfo: 'Tax ID verified',
    paymentMethods: [
      { method: 'Bank Transfer', account: 'HSBC • 01234567', default: true },
      { method: 'Mobile Money', account: 'MTN • 055 123 4567', default: false },
      { method: 'PayPal', account: 'ava@msa.company', default: false }
    ],
    links: [
      { label: 'Spotify', value: 'spotify.com/ava' },
      { label: 'Apple Music', value: 'music.apple.com/ava' },
      { label: 'YouTube', value: 'youtube.com/ava' },
      { label: 'Instagram', value: 'instagram.com/ava' },
      { label: 'TikTok', value: 'tiktok.com/ava' },
      { label: 'Website', value: 'avalane.com' }
    ]
  },
  settings: {
    preferences: [
      { label: 'Theme', value: 'Dark mode by default' },
      { label: 'Language', value: 'English' },
      { label: 'Email preferences', value: 'Weekly performance summaries enabled' },
      { label: 'Notification preferences', value: 'Release and payout alerts enabled' }
    ],
    security: [
      { label: 'Privacy', value: 'Artist profile visible to admins and selected partners' },
      { label: 'Security', value: 'JWT-protected and audit-ready' },
      { label: 'Sessions', value: 'Managed across desktop and mobile devices' }
    ],
    connectedAccounts: [
      { name: 'Spotify for Artists', status: 'Connected' },
      { name: 'Apple Music for Artists', status: 'Connected' }
    ],
    sessions: [
      { device: 'MacBook Pro', location: 'Accra, GH', time: 'Active now' },
      { device: 'iPhone 15', location: 'London, UK', time: 'Last active 2 hrs ago' }
    ]
  },
  help: {
    faq: [
      { question: 'How do I submit a release?', answer: 'Complete the metadata form, validate your artwork and audio, and submit for review.' },
      { question: 'How long does review take?', answer: 'Most metadata and artwork reviews complete within one business day.' },
      { question: 'How are royalties paid?', answer: 'Royalty payouts are settled according to your distributor and platform reporting cycle.' }
    ],
    guides: [
      { title: 'Distribution guide', detail: 'Understand how release dates, territories, and metadata map to platforms.' },
      { title: 'Artwork guide', detail: 'Learn how to create compliant cover art for streaming storefronts.' },
      { title: 'Audio requirements', detail: 'Ensure your song meets the quality, loudness, and formatting standards.' }
    ]
  }
};

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function serveFile(res, filePath) {
  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    res.end(content);
  });
}

function normalizeRoutePathname(pathname) {
  const nestedRoot = '/MSA_D';
  if (pathname === nestedRoot || pathname === `${nestedRoot}/`) {
    return '/';
  }
  if (pathname.startsWith(`${nestedRoot}/`)) {
    return pathname.slice(nestedRoot.length) || '/';
  }
  return pathname;
}

function buildPublicPath(pathname, targetPath) {
  if (!targetPath || targetPath.startsWith('http://') || targetPath.startsWith('https://')) {
    return targetPath;
  }
  const normalizedTarget = targetPath.replace(/^\.\//, '').replace(/^\//, '');
  if (!normalizedTarget) {
    return PUBLIC_BASE_PATH;
  }
  const normalizedPath = normalizeRoutePathname(pathname || '/');
  if (normalizedTarget === 'index.html' || normalizedTarget === '/') {
    return PUBLIC_BASE_PATH;
  }
  if (normalizedTarget.startsWith('dashboard/')) {
    return `${PUBLIC_BASE_PATH}/${normalizedTarget}`;
  }
  if (normalizedTarget.startsWith('login.') || normalizedTarget.startsWith('register.') || normalizedTarget.startsWith('auth.')) {
    return `${PUBLIC_BASE_PATH}/${normalizedTarget}`;
  }
  if (normalizedTarget.startsWith('dashboard')) {
    return `${PUBLIC_BASE_PATH}/${normalizedTarget}`;
  }
  return `${PUBLIC_BASE_PATH}/${normalizedTarget}`;
}

if (require.main === module) {
  const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const apiPath = normalizeRoutePathname(url.pathname);

  if (apiPath.startsWith('/api/')) {
    if (apiPath === '/api/health') {
      return sendJson(res, 200, { status: 'ok', branding: 'MSA TUNE STUDIO', config });
    }

    const localHandler = localApiPayloads[apiPath];
    if (localHandler) {
      return sendJson(res, 200, localHandler());
    }

    const backendPathMap = {
      '/api/dashboard': '/api/artists/dashboard',
      '/api/auth/login': '/api/auth/login',
      '/api/auth/register': '/api/auth/register',
      '/api/auth/refresh': '/api/auth/refresh',
      '/api/auth/logout': '/api/auth/logout',
      '/api/withdrawals': '/api/withdrawals',
      '/api/releases': '/api/releases',
      '/api/profile': '/api/profile',
      '/api/profile/payment-methods': '/api/profile/payment-methods',
      '/api/notifications': '/api/notifications',
      '/api/support': '/api/support'
    };
    const backendPath = backendPathMap[apiPath] || apiPath;
    const proxyOptions = {
      injectCookieAuth: true,
      responseModifier: null
    };

    if (apiPath === '/api/auth/login' || apiPath === '/api/auth/register') {
      proxyOptions.responseModifier = (headers, parsedResponse) => {
        if (parsedResponse && parsedResponse.ok && parsedResponse.data && parsedResponse.data.tokens && parsedResponse.data.tokens.accessToken) {
          headers['set-cookie'] = buildCookieHeader(parsedResponse.data.tokens.accessToken);
        }
      };
    }

    if (apiPath === '/api/auth/logout') {
      proxyOptions.responseModifier = (headers) => {
        headers['set-cookie'] = buildClearCookieHeader();
      };
    }

    if (req.method === 'GET' || req.method === 'DELETE') {
      return proxyApiRequest(req, res, backendPath, null, proxyOptions);
    }

    return readJsonBody(req, (err, body) => {
      if (err) {
        return sendJson(res, 400, { error: 'Invalid JSON' });
      }
      const buffer = body && Object.keys(body).length ? Buffer.from(JSON.stringify(body)) : null;
      proxyApiRequest(req, res, backendPath, buffer, proxyOptions);
    });
  }

  const pageRoute = apiPath === '/' ? '/' : apiPath;
  const pathname = pageRoute === '/' ? '/index.html' : pageRoute;
  let safePath = path.normalize(pathname).replace(/^\/+/, '');
  let filePath = path.join(rootDir, safePath);

  const requestAuthToken = getAuthCookie(req);
  const hasValidSession = verifyAuthToken(requestAuthToken);
  const isDashboardRoute = pathname === '/dashboard' || pathname === '/dashboard/' || pathname.startsWith('/dashboard/');
  const isAuthPage = pathname === '/login.html' || pathname === '/register.html' || pathname === '/auth.html';
  const isRootEntry = pathname === '/index.html' || pathname === '/' || pathname === '/MSA_D' || pathname === '/MSA_D/';

  if (isRootEntry) {
    const loginTarget = buildPublicPath(pathname, 'login.html');
    res.writeHead(302, {
      Location: loginTarget,
      'Content-Type': 'text/html; charset=utf-8'
    });
    res.end(`<!doctype html><html><head><meta http-equiv="refresh" content="0;url=${loginTarget}"></head><body>Redirecting to secure login...</body></html>`);
    return;
  }

  if (isAuthPage && hasValidSession) {
    const dashboardTarget = buildPublicPath(pathname, 'dashboard/');
    res.writeHead(302, {
      Location: dashboardTarget,
      'Content-Type': 'text/html; charset=utf-8'
    });
    res.end(`<!doctype html><html><head><meta http-equiv="refresh" content="0;url=${dashboardTarget}"></head><body>Redirecting to dashboard...</body></html>`);
    return;
  }

  if (isDashboardRoute && !hasValidSession) {
    const loginTarget = buildPublicPath(pathname, 'login.html');
    res.writeHead(302, {
      Location: loginTarget,
      'Content-Type': 'text/html; charset=utf-8'
    });
    res.end(`<!doctype html><html><head><meta http-equiv="refresh" content="0;url=${loginTarget}"></head><body>Redirecting to login...</body></html>`);
    return;
  }

  if (pathname === '/dashboard' || pathname === '/dashboard/') {
    filePath = path.join(rootDir, 'dashboard', 'index.html');
  } else if (pathname.startsWith('/dashboard/')) {
    const routePath = pathname.replace('/dashboard/', '');
    const routeFile = path.join(rootDir, 'dashboard', routePath, 'index.html');
    if (fs.existsSync(routeFile)) {
      filePath = routeFile;
    } else {
      filePath = path.join(rootDir, 'dashboard', 'index.html');
    }
  }

  if (filePath.startsWith(rootDir) && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    serveFile(res, filePath);
    return;
  }

  serveFile(res, path.join(rootDir, 'index.html'));
});

let currentPort = port;

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE' && currentPort === port) {
    const fallbackPort = port + 1;
    console.warn(`Port ${port} is already in use. Retrying on port ${fallbackPort}...`);
    currentPort = fallbackPort;
    server.listen(currentPort);
    return;
  }

  console.error('Server startup error:', error);
  process.exit(1);
});

server.listen(currentPort, () => {
  console.log(`MSA TUNE STUDIO server running on port ${currentPort}`);
});
}

module.exports = {
  normalizeRoutePathname,
  buildPublicPath
};
