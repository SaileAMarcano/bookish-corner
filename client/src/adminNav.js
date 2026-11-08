export const ADMIN_ITEMS = [
    { to: '/admin', label: 'nav.adminSummary', icon: 'genres', roles: ['admin', 'moderator'] },
    { to: '/admin/moderation', label: 'nav.adminModeration', icon: 'flag', roles: ['admin', 'moderator'] },
    { to: '/admin/people', label: 'nav.adminPeople', icon: 'following', roles: ['admin', 'moderator'] },
    { to: '/admin/applications', label: 'nav.adminApplications', icon: 'feather', roles: ['admin', 'moderator'] },
    { to: '/admin/invites', label: 'nav.adminInvites', icon: 'mail', roles: ['admin', 'moderator'] },
    { to: '/admin/catalog', label: 'nav.adminCatalog', icon: 'library', roles: ['admin', 'editor'] },
    { to: '/admin/activity', label: 'nav.adminActivity', icon: 'clock', roles: ['admin', 'moderator'] },
];