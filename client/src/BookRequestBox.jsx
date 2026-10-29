import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiFetch } from './api';

function BookRequestBox({ q }) {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [title, setTitle] = useState(q);
    const [author, setAuthor] = useState('');
    const [status, setStatus] = useState('idle');
    const [error, setError] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');
        setStatus('sending');

        apiFetch('/api/book-requests', { method: 'POST', body: { title, author } })
            .then(() => setStatus('sent'))
            .catch((err) => {
                setError(err.message);
                setStatus('idle');
            });
    };

    if (status === 'sent') {
        return <p className="book-request book-request-done" role="status">{t('bookRequest.sent', { title })}</p>;
    }

    if (!isOpen) {
        return (
            <div className="book-request">
                <span>{t('bookRequest.question')}</span>
                <button type="button" className="comment-button" onClick={() => setIsOpen(true)}>
                    {t('bookRequest.open')}
                </button>
            </div>
        );
    }

    return (
        <form className="book-request book-request-form" onSubmit={handleSubmit}>
            <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('bookRequest.titlePlaceholder')}
                aria-label={t('bookRequest.titlePlaceholder')}
                maxLength={200}
                required
            />
            <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder={t('bookRequest.authorPlaceholder')}
                aria-label={t('bookRequest.authorPlaceholder')}
                maxLength={120}
            />
            <button type="submit" className="comment-button" disabled={status === 'sending'}>
                {t('bookRequest.send')}
            </button>
            {error && <p className="access-error">{error}</p>}
        </form>
    );
}

export default BookRequestBox;
