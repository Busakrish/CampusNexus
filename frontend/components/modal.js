// components/modal.js

export function openModal({
    title = "",
    content = "",
    actions = []
}) {
    closeModal();

    const overlay = document.createElement("div");

    overlay.id = "common-modal";
    overlay.className = "modal-overlay";

    const actionHTML = actions
        .map(
            (action, index) => `
                <button
                    type="button"
                    class="${action.className || ""}"
                    data-modal-action="${index}"
                >
                    ${action.label}
                </button>
            `
        )
        .join("");

    overlay.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <h2>${title}</h2>

                <button
                    type="button"
                    data-modal-close
                    aria-label="Close"
                >
                    ×
                </button>
            </div>

            <div class="modal-body">
                ${content}
            </div>

            <div class="modal-footer">
                ${actionHTML}
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    overlay
        .querySelector("[data-modal-close]")
        .addEventListener("click", closeModal);

    actions.forEach((action, index) => {
        const button = overlay.querySelector(
            `[data-modal-action="${index}"]`
        );

        if (button && action.onClick) {
            button.addEventListener("click", action.onClick);
        }
    });
}

export function closeModal() {
    const modal = document.querySelector("#common-modal");

    if (modal) {
        modal.remove();
    }
}