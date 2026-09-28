export const API_URL = "http://localhost:3000";

const NETWORK_ERROR = "We couldn't reach Bookish Corner. Please check your connection.";
const GENERIC_ERROR = 'Something went wrong. Please try again.';

export function apiFetch(path, { body, ...options } = {}) {
    const isFormData = body instanceof FormData;
    const sendsJson = body !== undefined && !isFormData;

    return fetch(`${API_URL}${path}`, {
        credentials: 'include',
        ...options,
        headers: sendsJson ? { 'Content-Type': 'application/json' } : undefined,
        body: sendsJson ? JSON.stringify(body) : body,
    })

        .catch(() => {
            throw new Error(NETWORK_ERROR);
        })
        .then((res) =>
            res.json()
                .catch(() => null)
                .then((data) => {
                    if (!res.ok) {
                        const error = new Error(data?.error || GENERIC_ERROR);
                        error.status = res.status;
                        throw error;
                    }
                    return data;
                })
        );
}