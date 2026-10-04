/**
 * Notifications Page Component Logic
 */
async function loadNotificationsPage(containerSelector = '#notifications-container') {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  utils.renderLoading(container, 'Loading your notifications...');

  try {
    const res = await api.get('/notifications');
    if (!res.success || !res.data.notifications || res.data.notifications.length === 0) {
      utils.renderEmpty(container, 'No notifications', 'You are all caught up with your updates.');
      return;
    }

    const notifs = res.data.notifications;
    container.innerHTML = `
      <div style="display: flex; justify-content: flex-end; margin-bottom: 1rem;">
        <button class="btn btn-secondary btn-sm" id="mark-all-read-btn">Mark All as Read ✓</button>
      </div>
      <div style="display: flex; flex-direction: column; gap: 0.75rem;">
        ${notifs.map(n => `
          <div class="card card-hover" style="padding: 1.25rem; opacity: ${n.read ? '0.75' : '1'}; border-left: 4px solid ${n.read ? 'var(--border-subtle)' : 'var(--primary)'};" id="notif-card-${n.notificationId}">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem;">
              <div>
                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.35rem;">
                  <strong style="font-size: 1.05rem;">${n.title}</strong>
                  ${!n.read ? '<span class="badge badge-pending">NEW</span>' : ''}
                  <span style="font-size: 0.75rem; color: var(--text-muted);">${utils.formatDateTime(n.createdAt)}</span>
                </div>
                <p style="color: var(--text-secondary); font-size: 0.95rem; line-height: 1.4;">${n.message}</p>
              </div>
              ${!n.read ? `
                <button class="btn btn-secondary btn-sm" onclick="markNotificationRead('${n.notificationId}')">Mark Read</button>
              ` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    `;

    document.getElementById('mark-all-read-btn').onclick = async () => {
      try {
        await api.put('/notifications/mark-all-read');
        utils.toast('All notifications marked as read', 'success');
        loadNotificationsPage(containerSelector);
      } catch (err) {
        utils.toast(err.message, 'error');
      }
    };
  } catch (err) {
    utils.renderError(container, err.message, () => loadNotificationsPage(containerSelector));
  }
}

async function markNotificationRead(notificationId) {
  try {
    await api.put(`/notifications/${notificationId}/read`);
    utils.toast('Notification marked as read', 'success');
    const card = document.getElementById(`notif-card-${notificationId}`);
    if (card) {
      card.style.opacity = '0.75';
      card.style.borderLeftColor = 'var(--border-subtle)';
      const btn = card.querySelector('button');
      if (btn) btn.remove();
      const badge = card.querySelector('.badge-pending');
      if (badge) badge.remove();
    }
  } catch (err) {
    utils.toast(err.message, 'error');
  }
}

window.loadNotificationsPage = loadNotificationsPage;
window.markNotificationRead = markNotificationRead;

/**
 * Initialize a notifications page by container ID and optional external mark-all button ID.
 */
function initNotificationsPage(containerId, markAllBtnId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Kick off initial load
  _loadNotificationsInto(container);

  // Wire external mark-all button if provided
  if (markAllBtnId) {
    const btn = document.getElementById(markAllBtnId);
    if (btn) {
      btn.onclick = async () => {
        try {
          await api.put('/notifications/mark-all-read');
          utils.toast('All notifications marked as read', 'success');
          _loadNotificationsInto(container);
        } catch (err) {
          utils.toast(err.message, 'error');
        }
      };
    }
  }
}

async function _loadNotificationsInto(container) {
  utils.renderLoading(container, 'Loading notifications...');
  try {
    const res = await api.get('/notifications');
    const notifs = res.success ? (res.data.notifications || []) : [];

    if (notifs.length === 0) {
      utils.renderEmpty(container, 'No notifications', 'You are all caught up!');
      return;
    }

    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 0.75rem;">
        ${notifs.map(n => `
          <div class="card card-hover" style="padding: 1.25rem; opacity: ${n.read ? '0.75' : '1'}; border-left: 4px solid ${n.read ? 'var(--border-subtle)' : 'var(--primary)'}; transition: border-color 0.2s;" id="notif-card-${n.notificationId}">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem;">
              <div style="flex: 1;">
                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.35rem; flex-wrap: wrap;">
                  <strong style="font-size: 1rem;">${n.title}</strong>
                  ${!n.read ? '<span class="badge badge-pending">NEW</span>' : ''}
                  <span style="font-size: 0.75rem; color: var(--text-muted);">${utils.formatDateTime(n.createdAt)}</span>
                </div>
                <p style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.5; margin: 0;">${n.message}</p>
              </div>
              ${!n.read ? `
                <button class="btn btn-secondary btn-sm" onclick="markNotificationRead('${n.notificationId}')">Mark Read</button>
              ` : '<span style="font-size:1.2rem;">✓</span>'}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  } catch (err) {
    utils.renderError(container, err.message, () => _loadNotificationsInto(container));
  }
}

window.initNotificationsPage = initNotificationsPage;
