/**
 * CampusNexus UI Utilities & Helpers
 */
const utils = {
  toast(message, type = 'info', duration = 3500) {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };

    toast.innerHTML = `
      <div style="font-weight: bold; font-size: 1.1rem;">${icons[type] || 'ℹ'}</div>
      <div style="flex: 1; font-size: 0.9rem;">${message}</div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  confirmDialog(title, message, confirmText = 'Confirm', isDanger = false) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay active';
      overlay.innerHTML = `
        <div class="modal-content">
          <h3 style="margin-bottom: 0.75rem; font-size: 1.3rem;">${title}</h3>
          <p style="color: var(--text-secondary); margin-bottom: 1.5rem; line-height: 1.5;">${message}</p>
          <div class="modal-footer">
            <button class="btn btn-secondary" id="cancel-btn">Cancel</button>
            <button class="btn ${isDanger ? 'btn-danger' : 'btn-primary'}" id="confirm-btn">${confirmText}</button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);

      overlay.querySelector('#cancel-btn').onclick = () => {
        overlay.remove();
        resolve(false);
      };

      overlay.querySelector('#confirm-btn').onclick = () => {
        overlay.remove();
        resolve(true);
      };
    });
  },

  formatCurrency(amount) {
    const num = Number(amount) || 0;
    return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  },

  formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  },

  formatDateTime(dateStr) {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? 'N/A' : d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  },

  renderBadge(status) {
    const s = (status || '').toLowerCase();
    let badgeClass = 'badge-pending';

    if (['active', 'paid', 'paid/verified', 'verified', 'confirmed', 'completed', 'valid'].includes(s)) {
      badgeClass = 'badge-active';
    } else if (['cancelled', 'rejected', 'suspended', 'failed', 'expired', 'closed'].includes(s)) {
      badgeClass = 'badge-danger';
    } else if (['published', 'ongoing', 'ready', 'delivered/picked up'].includes(s)) {
      badgeClass = 'badge-info';
    }

    return `<span class="badge ${badgeClass}">${status || 'N/A'}</span>`;
  },

  renderLoading(container, text = 'Loading data...') {
    if (typeof container === 'string') container = document.querySelector(container);
    if (!container) return;
    container.innerHTML = `
      <div class="state-container">
        <div class="spinner"></div>
        <div class="state-title">${text}</div>
      </div>
    `;
  },

  renderEmpty(container, title = 'No records found', subtitle = 'There are currently no items in this section.') {
    if (typeof container === 'string') container = document.querySelector(container);
    if (!container) return;
    container.innerHTML = `
      <div class="state-container">
        <div class="state-icon">📂</div>
        <div class="state-title">${title}</div>
        <div class="state-subtitle">${subtitle}</div>
      </div>
    `;
  },

  renderError(container, message = 'Unable to load information.', retryFn = null) {
    if (typeof container === 'string') container = document.querySelector(container);
    if (!container) return;
    container.innerHTML = `
      <div class="state-container">
        <div class="state-icon" style="color: var(--accent-rose);">⚠️</div>
        <div class="state-title" style="color: var(--accent-rose);">Something went wrong</div>
        <div class="state-subtitle">${message}</div>
        ${retryFn ? `<button class="btn btn-secondary btn-sm" id="state-retry-btn">Try Again</button>` : ''}
      </div>
    `;
    if (retryFn) {
      container.querySelector('#state-retry-btn').onclick = retryFn;
    }
  }
};

window.utils = utils;
