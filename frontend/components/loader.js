// components/loader.js

export function showLoader(container) {
    if (!container) {
        return;
    }

    container.innerHTML = `
        <div class="loading-state">
            <span>Loading...</span>
        </div>
    `;
}

export function hideLoader(container) {
    if (!container) {
        return;
    }

    container.innerHTML = "";
}