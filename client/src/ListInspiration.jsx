import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import ListCard from './ListCard';
import { apiFetch } from './api';

function ListInspiration() {
    const { t, i18n } = useTranslation();
    const [lists, setLists] = useState([]);

    useEffect(() => {
        let ignore = false;

        apiFetch('/api/popular-lists')
            .then((data) => {
                if (!ignore) setLists(data);
            })
            .catch(() => {
                if (!ignore) setLists([]);
            });

        return () => {
            ignore = true;
        };
    }, [i18n.language]);

    const handleChange = (listId, changes) => {
        setLists((current) => current.map((list) => (list.id === listId ? { ...list, ...changes } : list)));
    };

    if (lists.length === 0) return null;

    return (
        <section className="list-inspiration" aria-labelledby="list-inspiration-heading">
            <h2 className="display profile-lists-title" id="list-inspiration-heading">{t('lists.inspiration')}</h2>
            <p className="list-inspiration-text">{t('lists.inspirationText')}</p>
            <div className="list-grid">
                {lists.map((list) => <ListCard key={list.id} list={list} onChange={handleChange} />)}
            </div>
        </section>
    );
}

export default ListInspiration;