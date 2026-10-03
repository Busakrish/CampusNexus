// components/confirmation.js

import {
    openModal,
    closeModal
} from "./modal.js";

export function confirmAction({
    title = "Confirm Action",
    message = "Are you sure?",
    confirmText = "Confirm",
    cancelText = "Cancel",
    onConfirm
}) {
    openModal({
        title,

        content: `
            <p>${message}</p>
        `,

        actions: [
            {
                label: cancelText,
                className: "btn-secondary",
                onClick: closeModal
            },

            {
                label: confirmText,
                className: "btn-danger",

                onClick: async () => {
                    try {
                        if (onConfirm) {
                            await onConfirm();
                        }
                    } finally {
                        closeModal();
                    }
                }
            }
        ]
    });
}