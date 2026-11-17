import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Notice from './Notice';
import Icon from './Icon';
import LoadingState from './LoadingState';
import { apiFetch } from './api';
import { formatDate } from './utils';
import './Announcements.css';

const EMPTY = { titleEs: '', bodyEs: '', titleEn: '', bodyEn: '', link: '' };

function LanguageFields({ lang, form, onChange }) {
    const { t } = useTranslation();
    const title = 'title' + lang;
    const body = 'body' + lang;

    return (
        <fieldset className="announce-language">
            <legend className="section-label">{t(`announcements.language${lang}`)}</legend>
            <label className="announce-field">
                <span>{t('announcements.titleLabel')}</span>
                <input type="text" maxLength={80} value={form[title]} onChange={(e) => onChange(title, e.target.value)} required />
                <small>{form[title].length}/80</small>
            </label>
            <label className="announce-field">
                <span>{t('announcements.bodyLabel')}</span>
                <textarea rows={5} maxLength={1000} value={form[body]} onChange={(e) => onChange(body, e.target.value)} required />
                <small>{form[body].length}/1000</small>
            </label>
        </fieldset>
    );
}

function AdminAnnouncements() {
    const { t } = useTranslation();
    const [form, setForm] = useState(EMPTY);
    const [data, setData] = useState(null);
    const [version, setVersion] = useState(0);
    const [confirming, setConfirming] = useState(false);
    const [deleting, setDeleting] = useState(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    useEffect(() => {
        apiFetch('/api/admin/announcements')
            .then(setData)
            .catch((err) => setError(err.message));
    }, [version]);

    const change = (field, value) => {
        setForm((current) => ({ ...current, [field]: value }));
        setConfirming(false);
    };

    const ready = ['titleEs', 'bodyEs', 'titleEn', 'bodyEn'].every((field) => form[field].trim());

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!ready || busy) return;
        if (!confirming) {
            setConfirming(true);
            return;
        }
        setBusy(true);
        setError('');
        setMessage('');
        apiFetch('/api/admin/announcements', { method: 'POST', body: form })
            .then(({ sent }) => {
                setForm(EMPTY);
                setConfirming(false);
                setMessage(t('announcements.sentMessage', { count: sent }));
                setVersion((current) => current + 1);
            })
            .catch((err) => setError(err.message))
            .finally(() => setBusy(false));
    };

    const handleDelete = (id) => {
        if (deleting !== id) {
            setDeleting(id);
            return;
        }
        setError('');
        apiFetch(`/api/admin/announcements/${id}`, { method: 'DELETE' })
            .then(() => {
                setDeleting(null);
                setMessage(t('announcements.deletedMessage'));
                setVersion((current) => current + 1);
            })
            .catch((err) => setError(err.message));
    };

    return (
        <main className="page admin-page">
            <div className="card tagged-hero">
                <div>
                    <div className="tagged-kicker">{t('announcements.kicker')}</div>
                    <h1 className="display tagged-title">{t('announcements.title')}</h1>
                    <p className="tagged-count">{t('announcements.lead')}</p>
                </div>
            </div>

            {error && <Notice message={error} />}
            {message && <p className="admin-message" role="status">{message}</p>}

            <section className="card admin-box">
                <h2 className="section-label">{t('announcements.newTitle')}</h2>
                <form className="announce-form" onSubmit={handleSubmit}>
                    <div className="announce-languages">
                        <LanguageFields lang="Es" form={form} onChange={change} />
                        <LanguageFields lang="En" form={form} onChange={change} />
                    </div>

                    <label className="announce-field">
                        <span>{t('announcements.linkLabel')}</span>
                        <input type="text" maxLength={200} value={form.link} placeholder="/explore" onChange={(e) => change('link', e.target.value)} />
                        <small>{t('announcements.linkHint')}</small>
                    </label>

                    {(form.titleEs || form.bodyEs) && (
                        <div className="announce-preview">
                            <span className="section-label">{t('announcements.preview')}</span>
                            <div className="announce-preview-card">
                                <img src="/push/book-bookmark.png" alt="" />
                                <div>
                                    <strong>{form.titleEs || t('announcements.titleLabel')}</strong>
                                    <p>{form.bodyEs.length > 160 ? form.bodyEs.slice(0, 159).trimEnd() + '…' : form.bodyEs}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {confirming && (
                        <p className="announce-confirm" role="alert">
                            {t('announcements.confirm', { count: data?.people ?? 0 })}
                        </p>
                    )}

                    <div className="announce-actions">
                        <button type="submit" className="invite-create" disabled={!ready || busy}>
                            <Icon name="bell" size={16} />
                            {t(confirming ? 'announcements.confirmSend' : 'announcements.send')}
                        </button>
                        {confirming && (
                            <button type="button" className="invite-action" onClick={() => setConfirming(false)}>
                                {t('announcements.cancel')}
                            </button>
                        )}
                    </div>
                </form>
            </section>

            <section className="card admin-box">
                <h2 className="section-label">{t('announcements.sentTitle')}</h2>
                {!data ? (
                    <LoadingState compact label={t('announcements.loading')} />
                ) : data.announcements.length === 0 ? (
                    <p className="tags-empty">{t('announcements.empty')}</p>
                ) : (
                    <ul className="announce-list">
                        {data.announcements.map((item) => (
                            <li key={item.id}>
                                <div>
                                    <span className="search-title">{item.titleEs}</span>
                                    <span className="search-author">
                                        {t('announcements.sentBy', { name: item.authorName || '—', date: formatDate(item.createdAt) })}
                                        {' · '}
                                        {t('announcements.stats', { sent: item.sent, opened: item.opened })}
                                    </span>
                                </div>
                                <button type="button" className="invite-action" onClick={() => handleDelete(item.id)}>
                                    {deleting === item.id ? t('announcements.confirmDelete') : <><Icon name="trash" size={15} /><span className="sr-only">{t('announcements.delete')}</span></>}
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </main>
    );
}

export default AdminAnnouncements;
