import { apiFetch } from './api';

export function pushSupport() {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
    return { supported, ios, needsInstall: ios && !standalone };
}

function keyBytes(base64) {
    const padded = (base64 + '='.repeat((4 - base64.length % 4) % 4)).replace(/-/g, '+').replace(/_/g, '/');
    return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}

export function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
    });
}

export async function currentSubscription() {
    if (!('serviceWorker' in navigator)) return null;
    const registration = await navigator.serviceWorker.getRegistration();
    return registration ? registration.pushManager.getSubscription() : null;
}

export async function enablePush(publicKey) {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return permission;
    const registration = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription()
        || await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) });
    await apiFetch('/api/push/subscriptions', { method: 'POST', body: subscription.toJSON() });
    return 'granted';
}

export async function disablePush() {
    const subscription = await currentSubscription();
    if (!subscription) return;
    await apiFetch('/api/push/subscriptions', { method: 'DELETE', body: { endpoint: subscription.endpoint } });
    await subscription.unsubscribe();
}

export async function forgetDevice() {
    const subscription = await currentSubscription().catch(() => null);
    if (!subscription) return;
    await apiFetch('/api/push/subscriptions', { method: 'DELETE', body: { endpoint: subscription.endpoint } }).catch(() => {});
}
