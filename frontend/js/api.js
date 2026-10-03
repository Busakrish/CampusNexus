// js/api.js

const API_BASE_URL = "http://localhost:5000/api";

async function request(endpoint, options = {}) {
    const token = localStorage.getItem("authToken");

    const headers = {
        "Content-Type": "application/json",
        ...options.headers
    };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers
    });

    let data = null;

    try {
        data = await response.json();
    } catch {
        data = null;
    }

    if (!response.ok) {
        const message =
            data?.message ||
            `Request failed with status ${response.status}`;

        throw new Error(message);
    }

    return data;
}

export async function apiGet(endpoint) {
    return request(endpoint, {
        method: "GET"
    });
}

export async function apiPost(endpoint, body) {
    return request(endpoint, {
        method: "POST",
        body: JSON.stringify(body)
    });
}

export async function apiPut(endpoint, body) {
    return request(endpoint, {
        method: "PUT",
        body: JSON.stringify(body)
    });
}

export async function apiDelete(endpoint) {
    return request(endpoint, {
        method: "DELETE"
    });
}

export { API_BASE_URL };