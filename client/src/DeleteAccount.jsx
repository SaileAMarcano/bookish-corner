import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Notice from './Notice';
import Icon from './Icon';
import { apiFetch } from './api';

function DeleteAccount({ username, onDeleted }) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [typed, setTyped] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    const matches = typed.trim().toLowerCase() === username.toLowerCase();

    const close = () => {
        setOpen(false);
        setTyped('');
        setPassword('');
        setError('');
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!matches || !password || busy) return;

        setBusy(true);
        setError('');
        apiFetch('/api/me', { method: 'DELETE', body: { username: typed, password } })
            .then(() => onDeleted())
            .catch((err) => {
                setError(err.message);
                setBusy(false);
            });
    };

    if (!open) {
        return (
            <div className="settings-row">
                <div className="settings-row-text">
                    <span className="settings-row-label">{t('settings.account.delete')}</span>
                    <span className="settings-row-hint">{t('settings.account.deleteHint')}</span>
                </div>
                <div className="settings-row-control">
                    <button type="button" className="ghost-button settings-danger-button" onClick={() => setOpen(true)}>
                        <Icon name="trash" size={14} />
                        {t('settings.account.delete')}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <form className="settings-delete" onSubmit={handleSubmit}>
            <h3 className="settings-delete-title">{t('settings.account.confirmTitle')}</h3>
            <p className="settings-delete-text">{t('settings.account.confirmText')}</p>

            <label className="edit-label" htmlFor="delete-username">
                {t('settings.account.typeUsername', { username })}
            </label>
            <input
                id="delete-username"
                className="edit-input"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                autoFocus
            />

            <label className="edit-label" htmlFor="delete-password">{t('settings.account.password')}</label>
            <input
                id="delete-password"
                type="password"
                className="edit-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
            />

            {error && <Notice message={error} />}

            <div className="settings-delete-actions">
                <button type="button" className="ghost-button" onClick={close} disabled={busy}>
                    {t('common.cancel')}
                </button>
                <button type="submit" className="settings-delete-confirm" disabled={!matches || !password || busy}>
                    {busy ? t('settings.account.deleting') : t('settings.account.confirmButton')}
                </button>
            </div>
        </form>
    );
}

export default DeleteAccount;