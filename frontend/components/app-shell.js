// components/app-shell.js

import { requireAuth, getCurrentRole } from "../js/auth.js";
import { renderNavbar } from "../js/navbar.js";
import { renderSidebar } from "./sidebar.js";

export function initializeAppShell() {

    if (!requireAuth()) {
        return false;
    }

    const role = getCurrentRole();

    const navbarContainer =
        document.querySelector("[data-navbar]");

    const sidebarContainer =
        document.querySelector("[data-sidebar]");

    if (navbarContainer) {
        renderNavbar(navbarContainer);
    }

    if (sidebarContainer) {
        renderSidebar(sidebarContainer, role);
    }

    return true;
}