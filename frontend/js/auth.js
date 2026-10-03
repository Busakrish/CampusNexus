// js/auth.js

import {
    ROLES,
    STORAGE_KEYS
} from "../config/constants.js";


/*
==========================================
SAVE AUTHENTICATION
==========================================
*/

export function saveAuth(token, user) {

    localStorage.setItem(
        STORAGE_KEYS.TOKEN,
        token
    );

    localStorage.setItem(
        STORAGE_KEYS.USER,
        JSON.stringify(user)
    );
}


/*
==========================================
GET TOKEN
==========================================
*/

export function getToken() {

    return localStorage.getItem(
        STORAGE_KEYS.TOKEN
    );
}


/*
==========================================
GET CURRENT USER
==========================================
*/

export function getCurrentUser() {

    const user =
        localStorage.getItem(
            STORAGE_KEYS.USER
        );

    if (!user) {
        return null;
    }

    try {

        return JSON.parse(user);

    } catch {

        // Stored user data is corrupted.
        // Remove it so the application
        // does not keep using invalid data.

        localStorage.removeItem(
            STORAGE_KEYS.USER
        );

        return null;
    }
}


/*
==========================================
GET CURRENT ROLE
==========================================
*/

export function getCurrentRole() {

    const user =
        getCurrentUser();

    return user?.role || null;
}


/*
==========================================
CHECK LOGIN STATUS
==========================================
*/

export function isLoggedIn() {

    return Boolean(
        getToken() &&
        getCurrentUser()
    );
}


/*
==========================================
CHECK ROLE
==========================================
*/

export function hasRole(...allowedRoles) {

    const currentRole =
        getCurrentRole();

    return allowedRoles.includes(
        currentRole
    );
}


/*
==========================================
LOGOUT
==========================================
*/

export function logout() {

    localStorage.removeItem(
        STORAGE_KEYS.TOKEN
    );

    localStorage.removeItem(
        STORAGE_KEYS.USER
    );

    window.location.href =
        "/login.html";
}


/*
==========================================
REQUIRE AUTHENTICATION
==========================================
*/

export function requireAuth() {

    if (!isLoggedIn()) {

        window.location.href =
            "/login.html";

        return false;
    }

    return true;
}


/*
==========================================
REQUIRE SPECIFIC ROLE
==========================================
*/

export function requireRole(...allowedRoles) {

    // First make sure the user
    // is logged in.

    if (!requireAuth()) {
        return false;
    }

    const currentRole =
        getCurrentRole();

    // If the user's role is not
    // allowed, send them to
    // their own dashboard.

    if (!allowedRoles.includes(currentRole)) {

        redirectToRoleDashboard();

        return false;
    }

    return true;
}


/*
==========================================
ROLE → DASHBOARD
==========================================
*/

export function getRoleDashboard(
    role = getCurrentRole()
) {

    const dashboards = {

        [ROLES.STUDENT]:
            "/student/dashboard.html",

        [ROLES.VOLUNTEER]:
            "/volunteer/dashboard.html",

        [ROLES.ADMIN]:
            "/admin/dashboard.html",

        [ROLES.TREASURER]:
            "/treasurer/dashboard.html",

        [ROLES.ORGANIZER]:
            "/organizer/dashboard.html"
    };

    return (
        dashboards[role] ||
        "/login.html"
    );
}


/*
==========================================
REDIRECT TO ROLE DASHBOARD
==========================================
*/

export function redirectToRoleDashboard() {

    window.location.href =
        getRoleDashboard();
}


/*
==========================================
REDIRECT IF ALREADY LOGGED IN
==========================================
*/

export function redirectIfAuthenticated() {

    if (!isLoggedIn()) {
        return false;
    }

    redirectToRoleDashboard();

    return true;
}