// js/navbar.js

import {
    getCurrentUser,
    logout
} from "./auth.js";


/*
==========================================
RENDER NAVBAR
==========================================
*/

export function renderNavbar(container) {

    if (!container) {
        return;
    }

    const user = getCurrentUser();

    if (!user) {
        return;
    }

    const userName =
        user.name ||
        user.fullName ||
        "User";

    const userRole =
        user.role ||
        "";


    container.innerHTML = `

        <header class="top-navbar">

            <div class="navbar-left">

                <button
                    type="button"
                    class="sidebar-toggle"
                    data-sidebar-toggle
                    aria-label="Toggle sidebar"
                >
                    ☰
                </button>

                <div class="page-heading">

                    <h1 data-page-title>
                        Dashboard
                    </h1>

                </div>

            </div>


            <div class="navbar-right">

                <button
                    type="button"
                    class="notification-button"
                    data-notification-button
                    aria-label="Notifications"
                >

                    <span class="notification-icon">
                        🔔
                    </span>

                    <span
                        class="notification-badge"
                        data-notification-count
                        hidden
                    >
                        0
                    </span>

                </button>


                <div class="navbar-user">

                    <div class="navbar-user-info">

                        <span
                            class="navbar-user-name"
                            data-user-name
                        >
                            ${escapeHTML(userName)}
                        </span>

                        <span
                            class="navbar-user-role"
                            data-user-role
                        >
                            ${escapeHTML(userRole)}
                        </span>

                    </div>


                    <div class="navbar-user-avatar">

                        <span>
                            ${getInitials(userName)}
                        </span>

                    </div>

                </div>


                <button
                    type="button"
                    class="logout-button"
                    data-logout
                >
                    Logout
                </button>

            </div>

        </header>

    `;


    initializeNavbarEvents();
}


/*
==========================================
NAVBAR EVENTS
==========================================
*/

function initializeNavbarEvents() {

    const logoutButton =
        document.querySelector("[data-logout]");


    if (logoutButton) {

        logoutButton.addEventListener(
            "click",
            () => {
                logout();
            }
        );

    }


    const sidebarToggle =
        document.querySelector(
            "[data-sidebar-toggle]"
        );


    if (sidebarToggle) {

        sidebarToggle.addEventListener(
            "click",
            () => {

                document.body.classList.toggle(
                    "sidebar-collapsed"
                );

            }
        );

    }

}


/*
==========================================
SET PAGE TITLE
==========================================
*/

export function setPageTitle(title) {

    const titleElement =
        document.querySelector(
            "[data-page-title]"
        );


    if (titleElement) {

        titleElement.textContent =
            title;

    }

}


/*
==========================================
NOTIFICATION COUNT
==========================================
*/

export function updateNotificationCount(count) {

    const badge =
        document.querySelector(
            "[data-notification-count]"
        );


    if (!badge) {
        return;
    }


    const notificationCount =
        Number(count) || 0;


    badge.textContent =
        notificationCount;


    badge.hidden =
        notificationCount === 0;

}


/*
==========================================
GET INITIALS
==========================================
*/

function getInitials(name) {

    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(
            word =>
                word
                    .charAt(0)
                    .toUpperCase()
        )
        .join("");

}


/*
==========================================
ESCAPE HTML
==========================================
*/

function escapeHTML(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}