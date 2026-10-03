// config/constants.js

export const ROLES = Object.freeze({
    STUDENT: "student",
    VOLUNTEER: "volunteer",
    ADMIN: "admin",
    TREASURER: "treasurer",
    ORGANIZER: "organizer"
});

export const EVENT_STATUS = Object.freeze({
    DRAFT: "draft",
    PENDING_APPROVAL: "pending_approval",
    APPROVED: "approved",
    REJECTED: "rejected",
    PUBLISHED: "published",
    ONGOING: "ongoing",
    COMPLETED: "completed",
    CANCELLED: "cancelled"
});

export const TASK_STATUS = Object.freeze({
    PENDING: "pending",
    IN_PROGRESS: "in_progress",
    COMPLETED: "completed",
    CANCELLED: "cancelled"
});

export const TASK_PRIORITY = Object.freeze({
    LOW: "low",
    MEDIUM: "medium",
    HIGH: "high",
    URGENT: "urgent"
});

export const PAYMENT_STATUS = Object.freeze({
    PENDING: "pending",
    PAID: "paid",
    FAILED: "failed",
    REFUNDED: "refunded"
});

export const EXPENSE_STATUS = Object.freeze({
    PENDING: "pending",
    UNDER_REVIEW: "under_review",
    APPROVED: "approved",
    REJECTED: "rejected",
    REIMBURSED: "reimbursed"
});

export const TRANSACTION_STATUS = Object.freeze({
    PENDING: "pending",
    VERIFIED: "verified",
    CANCELLED: "cancelled"
});

export const ACCOUNT_STATUS = Object.freeze({
    ACTIVE: "active",
    INACTIVE: "inactive",
    SUSPENDED: "suspended"
});

export const STORAGE_KEYS = Object.freeze({
    TOKEN: "authToken",
    USER: "currentUser"
});