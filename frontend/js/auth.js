/**
 * CampusNexus Authentication Manager
 * Handles Direct JWT Login & 2-Step Email OTP Registration Flow
 */
const auth = {
  getUser() {
    return api.getUser();
  },

  getToken() {
    return api.getToken();
  },

  isAuthenticated() {
    return !!this.getToken() && !!this.getUser();
  },

  setSession(token, user) {
    if (token) api.setToken(token);
    if (user) api.setUser(user);
  },

  getRoleDashboardUrl(role) {
    switch ((role || '').toUpperCase()) {
      case 'ADMIN':
        return '/admin/dashboard.html';
      case 'TREASURER':
        return '/treasurer/dashboard.html';
      case 'ORGANIZER':
        return '/organizer/dashboard.html';
      case 'VOLUNTEER':
        return '/volunteer/dashboard.html';
      case 'STUDENT':
      default:
        return '/student/dashboard.html';
    }
  },

  /**
   * Direct Login with Email & Password -> Returns JWT Token directly
   */
  async login(email, password) {
    const res = await api.post('/auth/login', { email, password });
    if (res.success && res.data && res.data.token) {
      this.setSession(res.data.token, res.data.user);
      return res.data;
    }
    throw new Error(res.message || 'Login failed. Please check your credentials.');
  },

  /**
   * Step 1: Initiate Student Registration -> Dispatches 6-digit OTP to user's email
   */
  async initiateRegistration(formData) {
    const res = await api.post('/auth/register-initiate', formData);
    if (res.success) {
      return res.data;
    }
    throw new Error(res.message || 'Registration request failed.');
  },

  /**
   * Step 2: Verify 6-Digit Email OTP -> Activates account and returns JWT session
   */
  async verifyRegistration(email, otp) {
    const res = await api.post('/auth/verify-registration-otp', { email, otp });
    if (res.success && res.data && res.data.token) {
      this.setSession(res.data.token, res.data.user);
      return res.data;
    }
    throw new Error(res.message || 'Invalid or expired verification code.');
  },

  /**
   * Resend Registration OTP (Enforces 60-second cooldown)
   */
  async resendRegistrationOtp(email) {
    const res = await api.post('/auth/resend-registration-otp', { email });
    if (res.success) {
      return res.data;
    }
    throw new Error(res.message || 'Failed to resend verification code.');
  },

  logout() {
    api.setToken(null);
    api.setUser(null);
    window.location.href = '/login.html';
  },

  requireAuth() {
    if (!this.isAuthenticated()) {
      window.location.href = '/login.html';
      return false;
    }
    return true;
  },

  requireRole(...allowedRoles) {
    if (!this.requireAuth()) return false;
    const user = this.getUser();
    if (!allowedRoles.includes(user.role)) {
      alert(`Access denied: Required role [${allowedRoles.join(', ')}]. Redirecting to your portal.`);
      window.location.href = this.getRoleDashboardUrl(user.role);
      return false;
    }
    return true;
  }
};

window.auth = auth;
