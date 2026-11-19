const crypto = require('crypto');

const SIGNATURE_TOLERANCE = 5 * 60;

function isLive() {
    return process.env.PADDLE_ENV === 'production';
}

function apiBase() {
    return isLive() ? 'https://api.paddle.com' : 'https://sandbox-api.paddle.com';
}

function paddleEnabled() {
    return Boolean(process.env.PADDLE_API_KEY && process.env.PADDLE_CLIENT_TOKEN && process.env.PADDLE_PRICE_ID);
}

function checkoutConfig() {
    return {
        environment: isLive() ? 'production' : 'sandbox',
        clientToken: process.env.PADDLE_CLIENT_TOKEN,
        priceId: process.env.PADDLE_PRICE_ID,
    };
}

function verifySignature(rawBody, header, secret) {
    if (!rawBody || !header || !secret) return false;

    let timestamp = null;
    const signatures = [];
    for (const part of header.split(';')) {
        const [key, value] = part.split('=');
        if (key === 'ts') timestamp = value;
        if (key === 'h1') signatures.push(value);
    }
    if (!timestamp || signatures.length === 0) return false;
    if (Math.abs(Date.now() / 1000 - Number(timestamp)) > SIGNATURE_TOLERANCE) return false;

    const expected = crypto.createHmac('sha256', secret).update(`${timestamp}:${rawBody}`).digest('hex');
    return signatures.some((signature) => signature.length === expected.length
        && crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected)));
}

async function paddleRequest(path, options = {}) {
    const response = await fetch(apiBase() + path, {
        ...options,
        headers: {
            Authorization: `Bearer ${process.env.PADDLE_API_KEY}`,
            'Content-Type': 'application/json',
        },
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
        const error = new Error(data?.error?.detail || 'Paddle request failed');
        error.status = response.status;
        throw error;
    }
    return data.data;
}

function cancelSubscription(subscriptionId) {
    return paddleRequest(`/subscriptions/${subscriptionId}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ effective_from: 'next_billing_period' }),
    });
}

function getSubscription(subscriptionId) {
    return paddleRequest(`/subscriptions/${subscriptionId}`);
}

function getTransaction(transactionId) {
    return paddleRequest(`/transactions/${transactionId}`);
}

module.exports = { paddleEnabled, checkoutConfig, verifySignature, cancelSubscription, getSubscription, getTransaction };