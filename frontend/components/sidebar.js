// components/sidebar.js

import { ROLES } from "../config/constants.js";

const sidebarConfig = {
    [ROLES.STUDENT]: [
        { label: "Dashboard", href: "/student/dashboard.html" },
        { label: "My Profile", href: "/student/profile.html" },
        { label: "Membership", href: "/student/membership.html" },
        { label: "Events", href: "/student/events.html" },
        { label: "My Tickets", href: "/student/tickets.html" },
        { label: "Merchandise", href: "/student/merchandise.html" },
        { label: "My Orders", href: "/student/orders.html" },
        { label: "Announcements", href: "/student/announcements.html" },
        { label: "Notifications", href: "/student/notifications.html" }
    ],

    [ROLES.VOLUNTEER]: [
        { label: "Dashboard", href: "/volunteer/dashboard.html" },
        { label: "My Tasks", href: "/volunteer/tasks.html" },
        { label: "Events", href: "/volunteer/events.html" },
        { label: "QR Scanner", href: "/volunteer/qr-scanner.html" },
        { label: "Fundraisers", href: "/volunteer/fundraisers.html" },
        { label: "My Expenses", href: "/volunteer/expenses.html" },
        { label: "Notifications", href: "/volunteer/notifications.html" }
    ],

    [ROLES.ADMIN]: [
        { label: "Dashboard", href: "/admin/dashboard.html" },
        { label: "Members", href: "/admin/members.html" },
        { label: "Events", href: "/admin/events.html" },
        { label: "Tickets", href: "/admin/tickets.html" },
        { label: "Volunteers", href: "/admin/volunteers.html" },
        { label: "Tasks", href: "/admin/tasks.html" },
        { label: "Fundraisers", href: "/admin/fundraisers.html" },
        { label: "Merchandise", href: "/admin/merchandise.html" },
        { label: "Orders", href: "/admin/orders.html" },
        { label: "Announcements", href: "/admin/announcements.html" },
        { label: "Users & Roles", href: "/admin/users-roles.html" },
        { label: "Organizers", href: "/admin/organizers.html" },
        { label: "Settings", href: "/admin/settings.html" }
    ],

    [ROLES.TREASURER]: [
        { label: "Dashboard", href: "/treasurer/dashboard.html" },
        { label: "Transactions", href: "/treasurer/transactions.html" },
        { label: "Income", href: "/treasurer/income.html" },
        { label: "Expenses", href: "/treasurer/expenses.html" },
        { label: "Fundraisers", href: "/treasurer/fundraisers.html" },
        { label: "Reimbursements", href: "/treasurer/reimbursements.html" },
        { label: "Budgets", href: "/treasurer/budgets.html" },
        { label: "Financial Reports", href: "/treasurer/financial-reports.html" },
        { label: "Notifications", href: "/treasurer/notifications.html" }
    ],

    [ROLES.ORGANIZER]: [
        { label: "Dashboard", href: "/organizer/dashboard.html" },
        { label: "My Organization", href: "/organizer/organization.html" },
        { label: "My Events", href: "/organizer/events.html" },
        { label: "Create Event", href: "/organizer/event-form.html" },
        { label: "Registrations", href: "/organizer/registrations.html" },
        { label: "Tickets", href: "/organizer/tickets.html" },
        { label: "QR Check-in", href: "/organizer/qr-scanner.html" },
        { label: "Attendance", href: "/organizer/attendance.html" },
        { label: "Event Reports", href: "/organizer/event-reports.html" },
        { label: "Announcements", href: "/organizer/announcements.html" },
        { label: "Notifications", href: "/organizer/notifications.html" }
    ]
};

export function renderSidebar(container, role) {
    if (!container) {
        return;
    }

    const items = sidebarConfig[role] || [];

    container.innerHTML = `
        <nav class="sidebar-navigation">
            ${items
                .map(
                    item => `
                        <a
                            href="${item.href}"
                            class="sidebar-link"
                        >
                            ${item.label}
                        </a>
                    `
                )
                .join("")}
        </nav>
    `;
}