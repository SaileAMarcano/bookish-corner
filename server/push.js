const { query } = require('./database');
const { pushText } = require('./messages');

const PUSH_GROUPS = {
    follows: ['follow'],
    comments: ['post_comment', 'review_comment', 'list_comment'],
    likes: ['post_like', 'review_like', 'list_like'],
    books: ['book_added'],
};

const GONE = new Set([404, 410]);
let library = null;

function pushEnabled() {
    return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

function webPush() {
    if (!library) {
        library = import('web-push').then((lib) => {
            lib.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:admin@alibraryofus.com', process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
            return lib;
        });
    }
    return library;
}

function groupOf(type) {
    return Object.keys(PUSH_GROUPS).find((group) => PUSH_GROUPS[group].includes(type));
}

function linkOf(row) {
    if (row.type === 'post_like' || row.type === 'post_comment') return `/post/${row.postId}`;
    if (row.type === 'follow') return `/u/${row.actorUsername}`;
    if (row.type === 'list_like' || row.type === 'list_comment') return `/lists/${row.listId}`;
    return `/book/${row.workId}`;
}

function shorten(text, size) {
    const clean = String(text || '').replace(/\s+/g, ' ').trim();
    return clean.length > size ? clean.slice(0, size - 1).trimEnd() + '…' : clean;
}

function payloadOf(row) {
    const action = pushText(row.language, row.type, { title: row.listTitle || row.bookTitle || '' });
    const comment = shorten(row.commentText, 120);
    return {
        title: row.actorName || 'A Library of Us',
        body: comment ? `${action}\n“${comment}”` : action,
        url: linkOf(row),
        tag: `${row.type}-${row.postId || row.listId || row.workId || row.actorUsername || row.id}`,
        notificationId: row.id,
    };
}

async function deliver(subscription, payload) {
    const lib = await webPush();
    try {
        await lib.sendNotification(
            { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
            JSON.stringify(payload),
            { TTL: 60 * 60 * 24, urgency: 'normal' }
        );
    } catch (error) {
        if (GONE.has(error.statusCode)) {
            await query('DELETE FROM push_subscriptions WHERE id = $1', [subscription.subscriptionId]);
        } else {
            console.error('Push failed', error.statusCode || error.message);
        }
    }
}

async function pushNotifications(ids) {
    if (!pushEnabled() || !ids.length) return;
    const rows = await query(`
        SELECT n.id, n.type, n.post_id, n.work_id, n.list_id,
               s.id AS subscription_id, s.endpoint, s.p256dh, s.auth,
               r.language, r.push_types,
               a.username AS actor_username, COALESCE(a.display_name, a.username) AS actor_name,
               COALESCE(t.title, w.title) AS book_title, l.title AS list_title,
               COALESCE(pc.text, c.text, lc.text) AS comment_text
        FROM notifications n
        JOIN users r ON r.id = n.user_id
        JOIN push_subscriptions s ON s.user_id = n.user_id
        LEFT JOIN users a ON a.id = n.actor_id
        LEFT JOIN works w ON w.id = n.work_id
        LEFT JOIN work_translations t ON t.work_id = w.id AND t.language = r.language
        LEFT JOIN lists l ON l.id = n.list_id
        LEFT JOIN post_comments pc ON pc.id = n.post_comment_id
        LEFT JOIN comments c ON c.id = n.comment_id
        LEFT JOIN list_comments lc ON lc.id = n.list_comment_id
        WHERE n.id = ANY($1::int[])
    `, [ids]);

    await Promise.all(rows
        .filter((row) => row.pushTypes.includes(groupOf(row.type)))
        .map((row) => deliver(row, payloadOf(row))));
}

function sendPushes(ids) {
    pushNotifications(ids).catch((error) => console.error('Push failed', error.message));
}

async function sendTestPush(userId) {
    const subscriptions = await query(`
        SELECT s.id AS subscription_id, s.endpoint, s.p256dh, s.auth, u.language
        FROM push_subscriptions s JOIN users u ON u.id = s.user_id
        WHERE s.user_id = $1
    `, [userId]);
    await Promise.all(subscriptions.map((subscription) => deliver(subscription, {
        title: pushText(subscription.language, 'testTitle'),
        body: pushText(subscription.language, 'testBody'),
        url: '/notifications',
        tag: 'test',
    })));
    return subscriptions.length;
}

module.exports = { PUSH_GROUPS, pushEnabled, sendPushes, sendTestPush };
