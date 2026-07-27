(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.PlatformLogic = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const BRAND = {
    name: 'MSA TUNE STUDIO',
    supportEmail: 'petersgodspower4@gmail.com',
    slogan: 'Premium music distribution for modern artists'
  };

  function createDemoState() {
    return {
      users: [
        {
          id: 'admin-1',
          name: 'Peters Godspower',
          email: 'admin@msa.company',
          password: 'Admin@2026',
          role: 'admin',
          isVerified: true,
          balance: 125000,
          pendingBalance: 0,
          lifetimeEarnings: 2450000
        },
        {
          id: 'artist-1',
          name: 'Ava Lane',
          email: 'artist@msa.company',
          password: 'Artist@2026',
          role: 'artist',
          isVerified: true,
          balance: 21340,
          pendingBalance: 4800,
          lifetimeEarnings: 182760
        }
      ],
      releases: [
        { id: 'r1', title: 'Midnight Echo', artist: 'Ava Lane', genre: 'Afrobeats', status: 'Approved', revenue: 3800, streams: 94000, releaseDate: '2026-07-01' },
        { id: 'r2', title: 'Neon Skyline', artist: 'Ava Lane', genre: 'Alt Pop', status: 'Draft', revenue: 0, streams: 0, releaseDate: '2026-08-12' },
        { id: 'r3', title: 'Golden Hour', artist: 'Ava Lane', genre: 'R&B', status: 'Under Review', revenue: 0, streams: 12000, releaseDate: '2026-09-02' }
      ],
      withdrawals: [
        { id: 'w1', artistId: 'artist-1', amount: 1500, status: 'Completed', requestedAt: '2026-06-20' },
        { id: 'w2', artistId: 'artist-1', amount: 2400, status: 'Pending', requestedAt: '2026-07-25' }
      ],
      supportTickets: [
        { id: 't1', title: 'Metadata update request', category: 'Metadata', priority: 'Medium', status: 'Open', author: 'Ava Lane' },
        { id: 't2', title: 'Withdrawal questions', category: 'Payments', priority: 'High', status: 'Resolved', author: 'Ava Lane' }
      ],
      notifications: [
        { id: 'n1', title: 'Release approved', body: 'Golden Hour passed review and is now live.', unread: true, category: 'Release' },
        { id: 'n2', title: 'Withdrawal request received', body: 'A new withdrawal is waiting for admin approval.', unread: false, category: 'Finance' }
      ],
      messages: [
        { id: 'm1', sender: 'admin', text: 'Your latest release looks strong. We will push it through review.', unread: false },
        { id: 'm2', sender: 'artist', text: 'I have updated the cover art and release date.', unread: true }
      ],
      announcements: [
        { id: 'a1', text: 'New distributor onboarding is now available for premium accounts.' }
      ],
      currentUserId: 'artist-1'
    };
  }

  function canEditRelease(release) {
    if (!release) return false;
    return String(release.status).toLowerCase() === 'draft';
  }

  function processWithdrawalApproval(withdrawal, user) {
    if (!withdrawal || !user) return null;
    if (String(withdrawal.status).toLowerCase() !== 'pending') return null;
    if (Number(user.balance) < Number(withdrawal.amount)) return null;

    return {
      ...withdrawal,
      status: 'Completed',
      completedAt: new Date().toISOString()
    };
  }

  function calculateDashboardMetrics(releases, user) {
    const totalRevenue = releases.reduce((sum, release) => sum + Number(release.revenue || 0), 0);
    const totalStreams = releases.reduce((sum, release) => sum + Number(release.streams || 0), 0);
    const pendingReleases = releases.filter((release) => ['Draft', 'Under Review'].includes(release.status)).length;
    const approvedReleases = releases.filter((release) => release.status === 'Approved').length;
    const currentBalance = Number(user?.balance || 0);
    const pendingBalance = Number(user?.pendingBalance || 0);

    return {
      totalRevenue,
      totalStreams,
      pendingReleases,
      approvedReleases,
      currentBalance,
      pendingBalance,
      estimatedEarnings: Math.round(totalRevenue * 0.74)
    };
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  return {
    BRAND,
    createDemoState,
    canEditRelease,
    processWithdrawalApproval,
    calculateDashboardMetrics,
    escapeHtml
  };
});
