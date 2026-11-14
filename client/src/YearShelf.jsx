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
import { BASE_WIDTH, bookcaseOf } from './bookcases';
import { DECORATIONS, autoItems, canSitOnPile, decorationItem, moveBy, pinShelves, savedItems, toPayload } from './shelfUtils';
import { findDecorationSpace, placementIssue, prepareDecorations, proposedMove } from './decorationPlacement';

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
    const [zoomContentWidth, setZoomContentWidth] = useState(null);
    const wallRef = useRef(null);
    const closeRef = useRef(null);
    const zoomBodyRef = useRef(null);

    useEffect(() => {
        const handleResize = () => setViewport(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const body = zoomBodyRef.current;
        if (!body || openYear === null) return undefined;

        const observer = new ResizeObserver(([entry]) => {
            if (entry.contentRect.width > 0) setZoomContentWidth(entry.contentRect.width);
        });
        observer.observe(body);
        return () => observer.disconnect();
    }, [openYear]);

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
    const wallDecorationWidth = viewport <= 600 ? Math.min(400, viewport - 72) : 400;
    const wallWidth = Math.min(320, viewport - 48);
    const decorationWidth = viewport <= 900 ? Math.min(560, viewport - 48) : Math.min(560, viewport - 520);
    const zoomWidth = viewport <= 900
        ? Math.min(600, viewport - 24, zoomContentWidth ?? Infinity)
        : Math.min(600, viewport - 520);

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
        const items = change(editing.items);
        const issue = placementIssue(items, editing.bookcase.model);
        if (issue) { setSaveError(issueMessage(issue)); return false; }
        setSaveError('');
        setEditing({ ...editing, items });
        return true;
    }

    function issueMessage(issue) {
        return t('library.shelf.placement.' + issue.kind, {
            name: issue.name ? t('library.shelf.objects.' + issue.name) : t('library.shelf.placement.object'),
        });
    }

    function checkMove(from, to, before, shelf) {
        const next = proposedMove(editing.items, from, to, before, shelf);
        return next.issue || placementIssue(next.items, editing.bookcase.model);
    }

    function move(from, to, before, shelf) {
        const next = proposedMove(editing.items, from, to, before, shelf);
        if (next.issue) { setSaveError(issueMessage(next.issue)); return; }
        changeItems(() => next.items);
    }

    function changeSelected(values) {
        changeItems((items) =>
            items.map((item) => (item.key === editing.selectedKey ? { ...item, ...values } : item))
        );
    }

    function removeSelected() {
        if (changeItems(items => items.filter(item => item.key !== editing.selectedKey))) {
            setEditing(current => ({ ...current, selectedKey: null }));
        }
    }

    function addDecoration(name) {
        const item = decorationItem(name);
        const items = findDecorationSpace(editing.items, item, editing.bookcase.model);
        if (!items) { setSaveError(issueMessage({ kind: 'noSpace', name })); return; }
        setSaveError('');
        setEditing({ ...editing, selectedKey: item.key, items });
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
        const issue = placementIssue(editing.items, editing.bookcase.model);
        if (issue) { setSaveError(issueMessage(issue)); return; }
        setSaving(true);
        setSaveError('');

        const { yearKey, bookcase } = editing;
        apiFetch('/api/shelf/' + yearKey, { method: 'PUT', body: { items: toPayload(pinShelves(editing.items, bookcase.model, BASE_WIDTH, { immersive: true })), bookcase } })
            .then((data) => {
                setLayout(data);
                setCases((current) => [...current.filter((row) => row.year !== yearKey), { year: yearKey, ...bookcase }]);
                setEditing(null);
            })
            .catch((err) => setSaveError(err.message))
            .finally(() => setSaving(false));
    }

    const views = groups.map(({ year, books: yearBooks }) => {
        const yearKey = year ?? 0;
        const isEditing = editing?.yearKey === yearKey;
        const bookcase = isEditing ? editing.bookcase : bookcaseOf(cases, year);
        const prepared = isEditing ? { items: editing.items } : prepareDecorations(itemsOf(year, yearBooks), bookcase.model);
        const items = prepared.items;

        return {
            year,
            yearKey,
            yearBooks,
            isEditing,
            items,
            label: year ?? t('library.undated'),
            bookcase,
            prepared,
            selectedIndex: isEditing ? items.findIndex((item) => item.key === editing.selectedKey) : -1,
            canOrganize: layout && milestones && !editing && (yearBooks.length > 0 || unlocked.length > 0),
        };
    });
    const openView = views.find((view) => view.yearKey === openYear) || null;

    function organize(view) {
        setOpenYear(view.yearKey);
        setSaveError(view.prepared.unplaced?.length ? t('library.shelf.placement.unplaced')
            : view.prepared.relocated ? t('library.shelf.placement.relocated') : '');
        setEditing({ yearKey: view.yearKey, items: pinShelves(view.items, view.bookcase.model, BASE_WIDTH, { immersive: true }), bookcase: view.bookcase, selectedKey: null });
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
                                    immersive
                                    decorationWidth={wallDecorationWidth}
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
                                    {saveError && <div className="year-shelf-placement-notice"><Notice message={saveError} /></div>}
                                </header>

                                <div className="year-shelf-zoom-body" ref={zoomBodyRef}>
                                    <ShelfRow
                                        items={openView.items}
                                        bookcase={openView.bookcase}
                                        width={zoomWidth}
                                        immersive
                                        decorationWidth={decorationWidth}
                                        label={t('library.shelf.yearLabel', { year: openView.label })}
                                        emptyText={t('library.shelf.empty')}
                                        editing={openView.isEditing}
                                        selectedKey={openView.isEditing ? editing.selectedKey : null}
                                        onSelect={(key) => setEditing((current) => ({ ...current, selectedKey: key }))}
                                        onMove={move}
                                        onCheckMove={(from, to, before, shelf) => {
                                            const issue = checkMove(from, to, before, shelf);
                                            return issue ? issueMessage(issue) : null;
                                        }}
                                    />

                                    {openView.isEditing && (
                                        <ShelfEditor
                                            item={openView.selectedIndex >= 0 ? openView.items[openView.selectedIndex] : null}
                                            isFirst={openView.selectedIndex === 0}
                                            isLast={openView.selectedIndex === openView.items.length - 1}
                                            canTop={openView.selectedIndex >= 0 && canSitOnPile(openView.items, editing.selectedKey)}
                                            tray={unlocked.filter((name) => !openView.items.some((item) => item.name === name))}
                                            saving={saving}
                                            error=""
                                            onMoveBy={(step) => changeItems((list) => moveBy(list, editing.selectedKey, step))}
                                            onPose={(pose) => changeSelected({ pose })}
                                            onTone={(tone) => changeSelected({ tone, color: null })}
                                            onColor={(color) => changeSelected({ color })}
                                            onFace={(face) => changeSelected({ face })}
                                            onMotif={(motif) => changeSelected({ motif })}
                                            bookcase={openView.bookcase}
                                            onBookcase={(next) => {
                                                const issue = placementIssue(editing.items, next.model);
                                                if (issue) { setSaveError(issueMessage(issue)); return; }
                                                setSaveError('');
                                                setEditing({ ...editing, bookcase: next });
                                            }}
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
