import { useTranslation } from 'react-i18next';
import InvitePanel from './InvitePanel';

function AdminInvites({ currentUser }) {
    const { t } = useTranslation();
    const isAdmin = currentUser.staffRole === 'admin';

    return (
        <main className="page admin-page">
            <div className="card tagged-hero">
                <div>
                    <div className="tagged-kicker">{t('admin.kicker')}</div>
                    <h1 className="display tagged-title">{t('invites.title')}</h1>
                    <p className="tagged-count">{isAdmin ? t('invites.lead') : t('invites.leadModerator')}</p>
                </div>
            </div>

            <InvitePanel isAdmin={isAdmin} />
        </main>
    );
}

export default AdminInvites;