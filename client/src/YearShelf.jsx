import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LibraryYearChallenge from './LibraryYearChallenge';
import ShelfDecoration from './ShelfDecoration';
import ShelfEditor from './ShelfEditor';
import ShelfRow from './ShelfRow';
import Notice from './Notice';
import Icon from './Icon';
import { apiFetch } from './api';
import { groupReadBooks } from './libraryUtils';
import { bookcaseOf } from './bookcases';
import { DECORATIONS, autoItems, canSitOnPile, decorationItem, moveBy, moveItem, moveToShelf, pinShelves, savedItems, toPayload } from './shelfUtils';

function YearShelf({ books, booksStatus, readingGoal, username }) {
    const { t } = useTranslation();
    const [milestones, setMilestones] = useState(null);
    const [layout, setLayout] = useState(null);
    const [cases, setCases] = useState([]);
    const [error, setError] = useState('');
    const [attempt, setAttempt] = useState(0);
    const [editing, setEditing] = useState(null);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [openYear, setOpenYear] = useState(null);
    const [viewport, setViewport] = useState(() => window.innerWidth);
    const wallRef = useRef(null);
    const closeRef = useRef(null);

    useEffect(() => {
        const handleResize = () => setViewport(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (openYear === null) return undefined;

        const previous = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        closeRef.current?.focus();

        const handleKey = (event) => {
            if (event.key === 'Escape') {
                setOpenYear(null);
                setEditing(null);
                setSaveError('');
            }
        };
        window.addEventListener('keydown', handleKey);

        return () => {
            document.body.style.overflow = previous;
            window.removeEventListener('keydown', handleKey);
        };
    }, [openYear]);

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

        Promise.all([apiFetch('/api/shelf'), apiFetch('/api/shelf-cases').catch(() => [])])
            .then(([data, saved]) => {
                if (!ignore) {
                    setLayout(data);
                    setCases(saved);
                }
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

    function showYear(yearKey) {
        const column = wallRef.current?.querySelector('[data-year="' + yearKey + '"]');
        column?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
    }

    function stopEditing() {
        setEditing(null);
        setSaveError('');
    }

    function closeYear() {
        stopEditing();
        setOpenYear(null);
    }

    function save() {
        setSaving(true);
        setSaveError('');

        const { yearKey, bookcase } = editing;
        apiFetch('/api/shelf/' + yearKey, { method: 'PUT', body: { items: toPayload(pinShelves(editing.items, bookcase.model)), bookcase } })
            .then((data) => {
                setLayout(data);
                setCases((current) => [...current.filter((row) => row.year !== yearKey), { year: yearKey, ...bookcase }]);
                setEditing(null);
            })
            .catch((err) => setSaveError(err.message))
            .finally(() => setSaving(false));
    }

    const wallWidth = viewport <= 600 ? Math.min(400, viewport - 72) : 400;
    const zoomWidth = viewport <= 900 ? Math.min(560, viewport - 48) : Math.min(560, viewport - 520);
    const views = groups.map(({ year, books: yearBooks }) => {
        const yearKey = year ?? 0;
        const isEditing = editing?.yearKey === yearKey;
        const items = isEditing ? editing.items : itemsOf(year, yearBooks);

        return {
            year,
            yearKey,
            yearBooks,
            isEditing,
            items,
            label: year ?? t('library.undated'),
            bookcase: isEditing ? editing.bookcase : bookcaseOf(cases, year),
            selectedIndex: isEditing ? items.findIndex((item) => item.key === editing.selectedKey) : -1,
            canOrganize: layout && milestones && !editing && (yearBooks.length > 0 || unlocked.length > 0),
        };
    });
    const openView = views.find((view) => view.yearKey === openYear) || null;

    function organize(view) {
        setOpenYear(view.yearKey);
        setEditing({ yearKey: view.yearKey, items: pinShelves(view.items, view.bookcase.model), bookcase: view.bookcase, selectedKey: null });
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
            ) : (
                <>
                    {groups.length > 1 && (
                        <nav className="year-shelf-years" aria-label={t('library.shelf.years')}>
                            {groups.map(({ year }) => (
                                <button key={year ?? 'undated'} type="button" className="year-shelf-button"
                                    onClick={() => showYear(year ?? 0)}>
                                    {year ?? t('library.undated')}
                                </button>
                            ))}
                        </nav>
                    )}
                    <div className="year-shelf-wall" ref={wallRef}>
                        {views.map((view) => (
                            <section className="year-shelf-card" key={view.yearKey} data-year={view.yearKey} aria-labelledby={'library-year-' + view.yearKey}>
                                <div className="year-shelf-card-head">
                                    {view.year === currentYear ? (
                                        <LibraryYearChallenge year={view.year} count={view.yearBooks.length} readingGoal={readingGoal} />
                                    ) : (
                                        <h2 className="display library-year-heading" id={'library-year-' + view.yearKey}>
                                            {view.label}
                                            <span>· {t('library.bookCount', { count: view.yearBooks.length })}</span>
                                        </h2>
                                    )}

                                    <div className="year-shelf-card-actions">
                                        <button type="button" className="year-shelf-button" onClick={() => setOpenYear(view.yearKey)}>
                                            {t('library.shelf.open')}
                                        </button>
                                        {view.canOrganize && (
                                            <button type="button" className="year-shelf-button year-shelf-organize" onClick={() => organize(view)}>
                                                {t('library.shelf.organize')}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <ShelfRow
                                    items={view.items}
                                    bookcase={view.bookcase}
                                    width={wallWidth}
                                    label={t('library.shelf.yearLabel', { year: view.label })}
                                    emptyText={t('library.shelf.empty')}
                                    editing={false}
                                    onOpen={() => setOpenYear(view.yearKey)}
                                />
                            </section>
                        ))}
                    </div>

                    {openView && (
                        <div className="year-shelf-zoom" onClick={(event) => event.target === event.currentTarget && !editing && closeYear()}>
                            <div className="year-shelf-zoom-panel" role="dialog" aria-modal="true" aria-labelledby="year-shelf-zoom-title">
                                <header className="year-shelf-zoom-head">
                                    <h2 className="display" id="year-shelf-zoom-title">
                                        {openView.label}
                                        <span>· {t('library.bookCount', { count: openView.yearBooks.length })}</span>
                                    </h2>
                                    {openView.canOrganize && (
                                        <button type="button" className="year-shelf-button year-shelf-organize" onClick={() => organize(openView)}>
                                            {t('library.shelf.organize')}
                                        </button>
                                    )}
                                    <button type="button" className="year-shelf-zoom-close" ref={closeRef}
                                        aria-label={t('library.shelf.close')} onClick={closeYear}>
                                        <Icon name="close" size={22} />
                                    </button>
                                </header>

                                <div className="year-shelf-zoom-body">
                                    <ShelfRow
                                        items={openView.items}
                                        bookcase={openView.bookcase}
                                        width={zoomWidth}
                                        label={t('library.shelf.yearLabel', { year: openView.label })}
                                        emptyText={t('library.shelf.empty')}
                                        editing={openView.isEditing}
                                        selectedKey={openView.isEditing ? editing.selectedKey : null}
                                        onSelect={(key) => setEditing((current) => ({ ...current, selectedKey: key }))}
                                        onMove={(fromKey, toKey, before, shelf) => changeItems((list) => (toKey ? moveItem(list, fromKey, toKey, before) : moveToShelf(list, fromKey, shelf)))}
                                    />

                                    {openView.isEditing && (
                                        <ShelfEditor
                                            item={openView.selectedIndex >= 0 ? openView.items[openView.selectedIndex] : null}
                                            isFirst={openView.selectedIndex === 0}
                                            isLast={openView.selectedIndex === openView.items.length - 1}
                                            canTop={openView.selectedIndex >= 0 && canSitOnPile(openView.items, editing.selectedKey)}
                                            tray={unlocked.filter((name) => !openView.items.some((item) => item.name === name))}
                                            saving={saving}
                                            error={saveError}
                                            onMoveBy={(step) => changeItems((list) => moveBy(list, editing.selectedKey, step))}
                                            onPose={(pose) => changeSelected({ pose })}
                                            onTone={(tone) => changeSelected({ tone })}
                                            onFace={(face) => changeSelected({ face })}
                                            onMotif={(motif) => changeSelected({ motif })}
                                            bookcase={openView.bookcase}
                                            onBookcase={(next) => setEditing((current) => ({ ...current, bookcase: next }))}
                                            onRemove={removeSelected}
                                            onAdd={addDecoration}
                                            onSave={save}
                                            onCancel={stopEditing}
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}

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
