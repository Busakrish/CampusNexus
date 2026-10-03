// js/notifications.js

import { apiGet, apiPut } from "./api.js";

export async function getNotifications() {
    return apiGet("/notifications");
}

export async function getUnreadNotifications() {
    return apiGet("/notifications/unread");
}

export async function markNotificationAsRead(notificationId) {
    return apiPut(
        `/notifications/${notificationId}/read`
    );
}

export async function markAllNotificationsAsRead() {
    return apiPut("/notifications/read-all");
}