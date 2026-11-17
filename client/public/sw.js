self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
    let data;
    try {
        data = event.data ? event.data.json() : {};
    } catch {
        data = { body: event.data ? event.data.text() : '' };
    }

    event.waitUntil(self.registration.showNotification(data.title || 'A Library of Us', {
        body: data.body || '',
        icon: '/icon-192.png',
        badge: '/badge-96.png',
        tag: data.tag,
        renotify: Boolean(data.tag),
        data: { url: data.url || '/notifications', id: data.notificationId || null },
    }));
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const { url, id } = event.notification.data || {};
    const target = new URL(url || '/', self.location.origin).href;

    event.waitUntil((async () => {
        if (id) {
            fetch('/api/notifications/' + id + '/read', { method: 'PATCH', credentials: 'include' }).catch(() => {});
        }
        const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        const open = windows.find((client) => new URL(client.url).origin === self.location.origin);
        if (open) {
            await open.focus();
            try {
                await open.navigate(target);
                return;
            } catch {
                return self.clients.openWindow(target);
            }
        }
        return self.clients.openWindow(target);
    })());
});
