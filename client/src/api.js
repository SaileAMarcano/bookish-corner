import i18n from './i18n';

export const API_URL = import.meta.env.DEV ? 'http://localhost:3000' : '';

export function apiFetch(path, { body, timeout, ...options } = {}) {
    const isFormData = body instanceof FormData;
    const sendsJson = body !== undefined && !isFormData;
    const controller = timeout ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), timeout) : null;

    return fetch(`${API_URL}${path}`, {
        credentials: 'include',
        signal: controller?.signal,
        ...options,
        headers: sendsJson
            ? { 'Content-Type': 'application/json', 'Accept-Language': i18n.language }
            : { 'Accept-Language': i18n.language },
        body: sendsJson ? JSON.stringify(body) : body,
    })

        .catch(() => {
            throw new Error(i18n.t(controller?.signal.aborted ? 'errors.timeout' : 'errors.network'));
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
        )
        .finally(() => clearTimeout(timer));
}