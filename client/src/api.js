import i18n from './i18n';

export const API_URL = import.meta.env.DEV ? 'http://localhost:3000' : '';

export function apiFetch(path, { body, ...options } = {}) {
    const isFormData = body instanceof FormData;
    const sendsJson = body !== undefined && !isFormData;

    return fetch(`${API_URL}${path}`, {
        credentials: 'include',
        ...options,
        headers: sendsJson
            ? { 'Content-Type': 'application/json', 'Accept-Language': i18n.language }
            : { 'Accept-Language': i18n.language },
        body: sendsJson ? JSON.stringify(body) : body,
    })

        .catch(() => {
            throw new Error(i18n.t('errors.network'));
        })
        .then((res) =>
            res.json()
                .catch(() => null)
                .then((data) => {
                    if (!res.ok) {
                        const error = new Error(data?.error || i18n.t('errors.generic'));
                        error.status = res.status;
                        throw error;
                    }
                    return data;
                })
        );
}