/**
 * Shared Navbar & Responsive Sidebar Navigation Renderer
 */
document.addEventListener('DOMContentLoaded', () => {
  const user = auth.getUser();
  if (!user && !window.location.pathname.includes('login.html') && !window.location.pathname.includes('register.html') && !window.location.pathname.endsWith('index.html') && window.location.pathname !== '/') {
    auth.requireAuth();
    return;
  }

  if (user) {
    renderSidebar(user);
    renderTopNavbar(user);
    setupMobileNavigation();
    fetchUnreadNotifications();
  }
});

function getRoleNavLinks(role) {
  const currentPath = window.location.pathname;

  switch (role) {
    case 'ADMIN':
      return [
        { label: 'Dashboard', icon: '📊', href: '/admin/dashboard.html' },
        { label: 'Members', icon: '👥', href: '/admin/members.html' },
        { label: 'Events & Approvals', icon: '📅', href: '/admin/events.html' },
        { label: 'Tickets Ledger', icon: '🎟️', href: '/admin/tickets.html' },
        { label: 'Volunteers', icon: '🤝', href: '/admin/volunteers.html' },
        { label: 'Task Assignments', icon: '📋', href: '/admin/tasks.html' },
        { label: 'Fundraisers', icon: '💰', href: '/admin/fundraisers.html' },
        { label: 'Merchandise Store', icon: '🛍️', href: '/admin/merchandise.html' },
        { label: 'Orders Fulfillment', icon: '📦', href: '/admin/orders.html' },
        { label: 'Announcements', icon: '📢', href: '/admin/announcements.html' },
        { label: 'Users & Roles', icon: '🛡️', href: '/admin/users-roles.html' },
        { label: 'Organizations', icon: '🏛️', href: '/admin/organizers.html' },
        { label: 'System Settings', icon: '⚙️', href: '/admin/settings.html' }
      ];

    case 'TREASURER':
      return [
        { label: 'Dashboard', icon: '📊', href: '/treasurer/dashboard.html' },
        { label: 'Transactions Ledger', icon: '💳', href: '/treasurer/transactions.html' },
        { label: 'Income Management', icon: '📈', href: '/treasurer/income.html' },
        { label: 'Expense Reviews', icon: '🧾', href: '/treasurer/expenses.html' },
        { label: 'Fundraiser Collections', icon: '💰', href: '/treasurer/fundraisers.html' },
        { label: 'Reimbursements', icon: '💸', href: '/treasurer/reimbursements.html' },
        { label: 'Budgets & Allocations', icon: '📊', href: '/treasurer/budgets.html' },
        { label: 'Financial Reports', icon: '📑', href: '/treasurer/financial-reports.html' },
        { label: 'Notifications', icon: '🔔', href: '/treasurer/notifications.html' }
      ];

    case 'ORGANIZER':
      return [
        { label: 'Dashboard', icon: '📊', href: '/organizer/dashboard.html' },
        { label: 'My Organization', icon: '🏛️', href: '/organizer/organization.html' },
        { label: 'Event Management', icon: '📅', href: '/organizer/events.html' },
        { label: 'Registrations', icon: '📝', href: '/organizer/registrations.html' },
        { label: 'Tickets Issued', icon: '🎟️', href: '/organizer/tickets.html' },
        { label: 'QR Scanner', icon: '📷', href: '/organizer/qr-scanner.html' },
        { label: 'Live Attendance', icon: '✅', href: '/organizer/attendance.html' },
        { label: 'Event Reports', icon: '📈', href: '/organizer/event-reports.html' },
        { label: 'Announcements', icon: '📢', href: '/organizer/announcements.html' },
        { label: 'Notifications', icon: '🔔', href: '/organizer/notifications.html' }
      ];

    case 'VOLUNTEER':
      return [
        { label: 'Dashboard', icon: '📊', href: '/volunteer/dashboard.html' },
        { label: 'Assigned Tasks', icon: '📋', href: '/volunteer/tasks.html' },
        { label: 'Assigned Events', icon: '📅', href: '/volunteer/events.html' },
        { label: 'QR Ticket Scanner', icon: '📷', href: '/volunteer/qr-scanner.html' },
        { label: 'Fundraiser Work', icon: '💰', href: '/volunteer/fundraisers.html' },
        { label: 'Expense Claims', icon: '🧾', href: '/volunteer/expenses.html' },
        { label: 'Notifications', icon: '🔔', href: '/volunteer/notifications.html' }
      ];

    case 'STUDENT':
    default:
      return [
        { label: 'Dashboard', icon: '📊', href: '/student/dashboard.html' },
        { label: 'Student Profile', icon: '👤', href: '/student/profile.html' },
        { label: 'Club Membership', icon: '🏛️', href: '/student/membership.html' },
        { label: 'Browse Events', icon: '📅', href: '/student/events.html' },
        { label: 'My Tickets', icon: '🎟️', href: '/student/tickets.html' },
        { label: 'Campus Merchandise', icon: '🛍️', href: '/student/merchandise.html' },
        { label: 'My Orders', icon: '📦', href: '/student/orders.html' },
        { label: 'Announcements', icon: '📢', href: '/student/announcements.html' },
        { label: 'Notifications', icon: '🔔', href: '/student/notifications.html' }
      ];
  }
}

function renderSidebar(user) {
  let sidebar = document.querySelector('.sidebar');
  if (!sidebar) {
    sidebar = document.createElement('aside');
    sidebar.className = 'sidebar';
    const appLayout = document.querySelector('.app-layout');
    if (appLayout) appLayout.prepend(sidebar);
    else document.body.prepend(sidebar);
  }

  const links = getRoleNavLinks(user.role);
  const currentPath = window.location.pathname;

  sidebar.innerHTML = `
    <div class="sidebar-brand">
      <span style="color: var(--accent-cyan); margin-right: 0.5rem;">❖</span> Campus<span style="color: var(--primary);">Nexus</span>
    </div>
    <nav class="sidebar-nav">
      <div class="nav-section-title">${user.role} PORTAL</div>
      ${links.map(link => {
        const isActive = currentPath.includes(link.href) || (currentPath.endsWith('/') && link.href.includes('dashboard'));
        return `
          <a href="${link.href}" class="nav-link ${isActive ? 'active' : ''}">
            <span class="nav-icon">${link.icon}</span>
            <span>${link.label}</span>
          </a>
        `;
      }).join('')}
    </nav>
  `;
}

function renderTopNavbar(user) {
  let topNavbar = document.querySelector('.top-navbar');
  if (!topNavbar) {
    topNavbar = document.createElement('header');
    topNavbar.className = 'top-navbar';
    const mainWrapper = document.querySelector('.main-wrapper');
    if (mainWrapper) mainWrapper.prepend(topNavbar);
  }

  const roleBadgeColors = {
    ADMIN: 'badge-danger',
    TREASURER: 'badge-info',
    ORGANIZER: 'badge-pending',
    VOLUNTEER: 'badge-active',
    STUDENT: 'badge-active'
  };

  topNavbar.innerHTML = `
    <div style="display: flex; align-items: center; gap: 1rem;">
      <button class="mobile-menu-toggle" id="mobile-nav-toggle" aria-label="Toggle Navigation">☰</button>
      <div style="font-size: 0.85rem; font-weight: 600; color: var(--text-secondary);">
        Welcome back, <strong style="color: var(--text-primary);">${user.name}</strong>
      </div>
    </div>
    <div class="navbar-right">
      <span class="badge ${roleBadgeColors[user.role] || 'badge-info'}">${user.role}</span>
      <button class="notification-bell-btn" id="nav-notif-btn" title="View Notifications">
        🔔
        <span class="notification-count-badge" id="nav-notif-count" style="display: none;">0</span>
      </button>
      <div style="display: flex; align-items: center; gap: 0.5rem;">
        <div class="user-avatar">${user.name.charAt(0).toUpperCase()}</div>
        <button class="btn btn-secondary btn-sm" onclick="auth.logout()" title="Sign Out">Logout ⎋</button>
      </div>
    </div>
  `;

  document.getElementById('nav-notif-btn').onclick = () => {
    const notifPage = `/${user.role.toLowerCase()}/notifications.html`;
    window.location.href = notifPage;
  };
}

function setupMobileNavigation() {
  const toggleBtn = document.getElementById('mobile-nav-toggle');
  const sidebar = document.querySelector('.sidebar');
  if (!toggleBtn || !sidebar) return;

  let backdrop = document.querySelector('.sidebar-backdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.className = 'sidebar-backdrop';
    document.body.appendChild(backdrop);
  }

  toggleBtn.onclick = () => {
    sidebar.classList.toggle('mobile-open');
    backdrop.classList.toggle('active');
  };

  backdrop.onclick = () => {
    sidebar.classList.remove('mobile-open');
    backdrop.classList.remove('active');
  };
}

async function fetchUnreadNotifications() {
  try {
    const res = await api.get('/notifications/unread-count');
    if (res.success && res.data) {
      const count = res.data.unreadCount || 0;
      const badge = document.getElementById('nav-notif-count');
      if (badge) {
        if (count > 0) {
          badge.textContent = count > 99 ? '99+' : count;
          badge.style.display = 'block';
        } else {
          badge.style.display = 'none';
        }
      }
    }
  } catch (err) {
    // Silent catch on background count check
  }
}
