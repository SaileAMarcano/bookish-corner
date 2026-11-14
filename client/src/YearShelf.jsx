import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LibraryYearChallenge from './LibraryYearChallenge';
import ShelfDecoration from './ShelfDecoration';
import ShelfEditor from './ShelfEditor';
import ShelfRow from './ShelfRow';
import Notice from './Notice';
import { apiFetch } from './api';
import { groupReadBooks } from './libraryUtils';
import { DECORATIONS, autoItems, canSitOnPile, decorationItem, moveBy, moveItem, savedItems, toPayload } from './shelfUtils';

function YearShelf({ books, booksStatus, readingGoal, username }) {
    const { t } = useTranslation();
    const [milestones, setMilestones] = useState(null);
    const [layout, setLayout] = useState(null);
    const [error, setError] = useState('');
    const [attempt, setAttempt] = useState(0);
    const [editing, setEditing] = useState(null);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');

    useEffect(() => {
        let ignore = false;

        apiFetch('/api/users/' + encodeURIComponent(username) + '/milestones')
            .then((data) => {
                if (!ignore) {
                    setMilestones(data);
                    setError('');
                }
            })
            .catch((err) => {
                if (!ignore) setError(err.message);
            });

        return () => {
            ignore = true;
        };
    }, [username, books, readingGoal, attempt]);

    useEffect(() => {
        let ignore = false;

        apiFetch('/api/shelf')
            .then((data) => {
                if (!ignore) setLayout(data);
            })
            .catch((err) => {
                if (!ignore) setError(err.message);
            });

        return () => {
            ignore = true;
        };
    }, [username, attempt]);

    function retry() {
        setError('');
        setAttempt((value) => value + 1);
    }

    const currentYear = new Date().getFullYear();
    const allGroups = groupReadBooks(books);
    const groups = [
        { year: currentYear, books: allGroups.find((group) => group.year === currentYear)?.books || [] },
        ...allGroups.filter((group) => group.year !== currentYear),
    ];
    const unlocked = DECORATIONS
        .filter((decoration) =>
            milestones?.some((milestone) => milestone.key === decoration.milestone && milestone.achieved)
        )
        .map((decoration) => decoration.name);
    const rows = layout || [];

    function itemsOf(year, yearBooks) {
        const yearRows = rows.filter((row) => row.year === (year ?? 0));
        if (yearRows.length > 0) return savedItems(yearBooks, yearRows, unlocked);

        const items = autoItems(yearBooks);
        if (year === currentYear) {
            for (const name of unlocked) {
                if (!rows.some((row) => row.decoration === name)) items.push(decorationItem(name));
            }
        }
        return items;
    }

    function changeItems(change) {
        setEditing((current) => ({ ...current, items: change(current.items) }));
    }

    function changeSelected(values) {
        changeItems((items) =>
            items.map((item) => (item.key === editing.selectedKey ? { ...item, ...values } : item))
        );
    }

    function removeSelected() {
        setEditing((current) => ({
            ...current,
            selectedKey: null,
            items: current.items.filter((item) => item.key !== current.selectedKey),
        }));
    }

    function addDecoration(name) {
        const item = decorationItem(name);
        setEditing((current) => ({ ...current, selectedKey: item.key, items: [...current.items, item] }));
    }

    function stopEditing() {
        setEditing(null);
        setSaveError('');
    }

    function save() {
        setSaving(true);
        setSaveError('');

        apiFetch('/api/shelf/' + editing.yearKey, { method: 'PUT', body: { items: toPayload(editing.items) } })
            .then((data) => {
                setLayout(data);
                setEditing(null);
            })
            .catch((err) => setSaveError(err.message))
            .finally(() => setSaving(false));
    }

    return (
        <section className="year-shelf-view" aria-labelledby="year-shelf-title">
            <header className="year-shelf-intro">
                <h2 className="display" id="year-shelf-title">{t('library.shelf.title')}</h2>
                <p>{t('library.shelf.description')}</p>
                <p>{t('library.shelf.scroll')}</p>
            </header>

            {error && <Notice message={error} onRetry={retry} />}
            {!milestones && !error && <p role="status">{t('milestones.loading')}</p>}

            {booksStatus !== 'ready' ? (
                <p role="status">{t(booksStatus === 'error' ? 'library.shelf.booksError' : 'nightstand.loading')}</p>
            ) : groups.map(({ year, books: yearBooks }) => {
                const yearKey = year ?? 0;
                const isEditing = editing?.yearKey === yearKey;
                const items = isEditing ? editing.items : itemsOf(year, yearBooks);
                const selectedIndex = isEditing ? items.findIndex((item) => item.key === editing.selectedKey) : -1;
                const canOrganize = layout && milestones && !editing && (yearBooks.length > 0 || unlocked.length > 0);

                return (
                    <section className="year-shelf-card" key={year ?? 'undated'} aria-labelledby={'library-year-' + (year ?? 'undated')}>
                        {year === currentYear ? (
                            <LibraryYearChallenge year={year} count={yearBooks.length} readingGoal={readingGoal} />
                        ) : (
                            <h2 className="display library-year-heading" id={'library-year-' + (year ?? 'undated')}>
                                {year ?? t('library.undated')}
                                <span>· {t('library.bookCount', { count: yearBooks.length })}</span>
                            </h2>
                        )}

                        {canOrganize && (
                            <button type="button" className="year-shelf-button year-shelf-organize"
                                onClick={() => setEditing({ yearKey, items, selectedKey: null })}>
                                {t('library.shelf.organize')}
                            </button>
                        )}

                        <ShelfRow
                            items={items}
                            label={t('library.shelf.yearLabel', { year: year ?? t('library.undated') })}
                            emptyText={t('library.shelf.empty')}
                            editing={isEditing}
                            selectedKey={isEditing ? editing.selectedKey : null}
                            onSelect={(key) => setEditing((current) => ({ ...current, selectedKey: key }))}
                            onMove={(fromKey, toKey, before) => changeItems((list) => moveItem(list, fromKey, toKey, before))}
                        />

                        {isEditing && (
                            <ShelfEditor
                                item={selectedIndex >= 0 ? items[selectedIndex] : null}
                                isFirst={selectedIndex === 0}
                                isLast={selectedIndex === items.length - 1}
                                canTop={selectedIndex >= 0 && canSitOnPile(items, editing.selectedKey)}
                                tray={unlocked.filter((name) => !items.some((item) => item.name === name))}
                                saving={saving}
                                error={saveError}
                                onMoveBy={(step) => changeItems((list) => moveBy(list, editing.selectedKey, step))}
                                onPose={(pose) => changeSelected({ pose })}
                                onTone={(tone) => changeSelected({ tone })}
                                onMotif={(motif) => changeSelected({ motif })}
                                onRemove={removeSelected}
                                onAdd={addDecoration}
                                onSave={save}
                                onCancel={stopEditing}
                            />
                        )}
                    </section>
                );
            })}

            {milestones && (
                <section className="year-shelf-rewards" aria-labelledby="year-shelf-rewards-title">
                    <h2 className="display" id="year-shelf-rewards-title">{t('library.shelf.rewards')}</h2>
                    <ul className="year-shelf-reward-list">
                        {DECORATIONS.map(({ name, milestone }) => {
                            const achieved = unlocked.includes(name);

                            return (
                                <li key={name} className={achieved ? '' : 'year-shelf-locked'}>
                                    <ShelfDecoration name={name} />
                                    <div>
                                        <strong>{t('library.shelf.objects.' + name)}</strong>
                                        <span>{t(achieved ? 'library.shelf.unlocked' : 'library.shelf.locked')}</span>
                                        <small>{t('milestones.items.' + milestone + '.rule')}</small>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                    <Link to="/achievements">{t('celebration.seeAll')}</Link>
                </section>
            )}
        </section>
    );
}

export default YearShelf;
