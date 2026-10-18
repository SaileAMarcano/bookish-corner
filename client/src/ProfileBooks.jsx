import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const STATUSES = ['want-to-read', 'reading', 'paused', 'dnf', 'finished'];

function ProfileBooks({ books, emptyText, renderBook }) {
    const { t } = useTranslation();
    const [status, setStatus] = useState('all');

    if (books.length === 0) {
        return <div className="card profile-empty">{emptyText}</div>
    }

    const countOf = (key) => books.filter((book) => book.status === key).length;
    const shown = status === 'all' ? books : books.filter((book) => book.status === status);

    return (
        <>
            <div className="book-filter" role="group" aria-label={t('profileBooks.filterLabel')}>
                <button type="button" className={`book-filter-chip ${status === 'all' ? 'active' : ''}`} onClick={() => setStatus('all')} aria-pressed={status === 'all'}>
                    {t('profileBooks.all')} <span className="book-filter-count">{books.length}</span>
                </button>

                {STATUSES.map((key) => (
                    <button key={key} type="button" className={`book-filter-chip status-${key} ${status === key ? 'active' : ''}`} onClick={() => setStatus(key)} aria-pressed={status === key}>
                        {t(`status.${key}`)} <span className="book-filter-count">{countOf(key)}</span>
                    </button>
                ))}
            </div>

            {shown.length === 0 ? (
                <div className="card profile-empty">{t('profileBooks.noneWithStatus')}</div>
            ) : (
                <div className="grid">{shown.map(renderBook)}</div>
            )}
        </>
    );
}

export default ProfileBooks