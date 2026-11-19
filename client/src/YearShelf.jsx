import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ShelfViewer from './ShelfViewer';
import ShelfDecoration from './ShelfDecoration';
import ShelfEditor from './ShelfEditor';
import ShelfRow from './ShelfRow';
import Notice from './Notice';
import Icon from './Icon';
import { apiFetch } from './api';
import { groupReadBooks } from './libraryUtils';
import { BASE_WIDTH, bookcaseOf, caseGeometry, shelfDensity } from './bookcases';
import { DECORATIONS, autoItems, canSitOnPile, decorationItem, groupItems, moveBy, pinShelves, savedItems, toPayload } from './shelfUtils';
import { findDecorationSpace, placementIssue, prepareDecorations, proposedMove, shelfCapacity } from './decorationPlacement';

function YearShelf({ books, booksStatus, readingGoal, username, isMember }) {
    const { t } = useTranslation();
    const [milestones, setMilestones] = useState(null);
    const [layout, setLayout] = useState(null);
    const [cases, setCases] = useState([]);
    const [error, setError] = useState('');
    const [attempt, setAttempt] = useState(0);
    const [editing, setEditing] = useState(null);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [toolsOpen, setToolsOpen] = useState(false);
    const [moveFeedback, setMoveFeedback] = useState('');
    const [openYear, setOpenYear] = useState(null);
    const [viewport, setViewport] = useState(() => window.innerWidth);
    const [zoomContentWidth, setZoomContentWidth] = useState(null);
    const closeRef = useRef(null);
    const zoomBodyRef = useRef(null);

    useEffect(() => {
        const handleResize = () => {
            const nextDensity = shelfDensity(window.innerWidth);
            setViewport(window.innerWidth);
            setEditing(current => {
                if (!current || current.density === nextDensity) return current;
                const prepared = prepareDecorations(current.items, current.bookcase.model, { density: nextDensity });
                return { ...current, items: prepared.items, density: nextDensity,
                    selectedKey: prepared.items.some(item => item.key === current.selectedKey) ? current.selectedKey : null,
                    unplaced: [...new Set([...(current.unplaced || []), ...prepared.unplaced])] };
            });
        };
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
        const trigger = document.activeElement;
        document.body.style.overflow = 'hidden';
        closeRef.current?.focus();

        const handleKey = (event) => {
            if (event.key === 'Tab') {
                const panel = closeRef.current?.closest('[role="dialog"]');
                const controls = [...panel.querySelectorAll('a[href], button:not(:disabled), input, select, summary')].filter(node => node.getClientRects().length > 0);
                const first = controls[0];
                const last = controls[controls.length - 1];
                if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
                else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
            }
            if (event.key === 'Escape') {
                setOpenYear(null);
                setEditing(null);
                setSaveError('');
            }
        };
        window.addEventListener('keydown', handleKey);

        return () => {
            document.body.style.overflow = previous;
            if (trigger?.isConnected && trigger.matches('button, a, summary, input, select') && trigger.getClientRects().length) trigger.focus();
            else document.querySelector('.bookshelf-header .year-shelf-save')?.focus();
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
        .filter((decoration) => decoration.free || (decoration.member
            ? isMember
            : milestones?.some((milestone) => milestone.key === decoration.milestone && milestone.achieved)
        ))
        .map((decoration) => decoration.name);
    const earned = DECORATIONS.filter((decoration) => decoration.milestone).map((decoration) => decoration.name);
    const rows = layout || [];
    const density = shelfDensity(viewport);
    const shelfOptions = { immersive: true, density };
    const decorationWidth = viewport <= 900 ? Math.min(560, viewport - 48) : Math.min(560, viewport - 520);
    const zoomWidth = viewport <= 900
        ? Math.min(600, viewport - 24, zoomContentWidth ?? Infinity)
        : Math.min(600, viewport - 520);

    function itemsOf(year, yearBooks) {
        const yearRows = rows.filter((row) => row.year === (year ?? 0));
        if (yearRows.length > 0) return savedItems(yearBooks, yearRows, unlocked);

        const items = autoItems(yearBooks);
        if (year === currentYear) {
            for (const name of unlocked.filter((name) => earned.includes(name))) {
                if (!rows.some((row) => row.decoration === name)) items.push(decorationItem(name));
            }
        }
        return items;
    }

    function changeItems(change) {
        const items = change(editing.items);
        const issue = placementIssue(items, editing.bookcase.model, shelfOptions);
        if (issue) { setMoveFeedback(''); setSaveError(issueMessage(issue)); return false; }
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
        return next.issue || placementIssue(next.items, editing.bookcase.model, shelfOptions);
    }

    function move(from, to, before, shelf, x) {
        setMoveFeedback('');
        const next = proposedMove(editing.items, from, to, before, shelf);
        if (next.issue) { setSaveError(issueMessage(next.issue)); return; }
        const placed = Number.isFinite(x)
            ? next.items.map((item) => (item.key === from ? { ...item, pose: 'upright', x } : item))
            : next.items.map((item) => (item.key === from && to ? { ...item, x: null } : item));
        changeItems(() => placed);
    }

    function nudgeSelected(step) {
        setMoveFeedback('');
        const selected = editing.items.find((item) => item.key === editing.selectedKey);
        if (selected?.type === 'decoration' && Number.isFinite(selected.x)) {
            changeSelected({ x: Math.round(Math.min(1, Math.max(0, selected.x + step * 0.1)) * 100) / 100 });
            return;
        }
        changeItems(list => moveBy(list, editing.selectedKey, step));
    }

    function selectItem(key) {
        setSaveError('');
        setMoveFeedback('');
        setEditing(current => ({ ...current, selectedKey: key }));
        if (key) {
            setToolsOpen(true);
            requestAnimationFrame(() => {
                zoomBodyRef.current?.querySelector('.year-shelf-editor')?.scrollTo({ top: 0 });
            });
            revealItem(key);
        }
    }

    function moveSelectedToShelf(shelf) {
        if (!Number.isInteger(shelf) || shelf < 0 || shelf >= shelfCapacity(editing.items)) return;
        const next = proposedMove(editing.items, editing.selectedKey, null, false, shelf);
        if (!changeItems(() => next.items)) return;
        setMoveFeedback(t('library.shelf.movedToShelf', { number: shelf + 1 }));
        revealItem(editing.selectedKey);
    }

    function revealItem(key) {
        requestAnimationFrame(() => {
            const body = zoomBodyRef.current;
            const selected = body?.querySelector('[data-shelf-key="' + CSS.escape(key) + '"]');
            const scroller = body?.closest('.year-shelf-zoom');
            if (!selected || !scroller) return;
            const box = selected.getBoundingClientRect();
            const top = body.closest('.year-shelf-zoom-panel').querySelector('.year-shelf-zoom-head').getBoundingClientRect().bottom + 12;
            const bottom = viewport <= 900 ? body.querySelector('.year-shelf-editor-drawer').getBoundingClientRect().top - 12 : window.innerHeight - 12;
            const offset = box.top < top ? box.top - top : box.bottom > bottom ? Math.min(box.bottom - bottom, box.top - top) : 0;
            scroller.scrollBy({ top: offset, behavior: 'auto' });
        });
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
        const items = findDecorationSpace(editing.items, item, editing.bookcase.model, shelfOptions);
        if (!items) { setSaveError(issueMessage({ kind: 'noSpace', name })); return; }
        setSaveError('');
        setEditing({ ...editing, selectedKey: item.key, items,
            unplaced: editing.unplaced?.filter(decoration => decoration !== name) });
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
        const issue = placementIssue(editing.items, editing.bookcase.model, shelfOptions);
        if (issue) { setSaveError(issueMessage(issue)); return; }
        setSaving(true);
        setSaveError('');

        const { yearKey, bookcase } = editing;
        apiFetch('/api/shelf/' + yearKey, { method: 'PUT', body: { items: toPayload(pinShelves(editing.items, bookcase.model, BASE_WIDTH, shelfOptions)), bookcase } })
            .then((data) => {
                setLayout(data);
                setCases((current) => [...current.filter((row) => row.year !== yearKey), { year: yearKey, ...bookcase }]);
                setEditing(null);
                setOpenYear(null);
            })
            .catch((err) => setSaveError(err.message))
            .finally(() => setSaving(false));
    }

    const views = groups.map(({ year, books: yearBooks }) => {
        const yearKey = year ?? 0;
        const isEditing = editing?.yearKey === yearKey;
        const bookcase = isEditing ? editing.bookcase : bookcaseOf(cases, year);
        const prepared = isEditing ? { items: editing.items } : prepareDecorations(itemsOf(year, yearBooks), bookcase.model, shelfOptions);
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
    const caseHeight = Math.max(...views.map(view => caseGeometry(view.bookcase.model, BASE_WIDTH, shelfOptions, groupItems(view.items)).height));
    const openView = views.find((view) => view.yearKey === openYear) || null;

    function organize(view) {
        setOpenYear(view.yearKey);
        setSaveError(view.prepared.unplaced?.length ? t('library.shelf.placement.unplaced')
            : view.prepared.relocated ? t('library.shelf.placement.relocated') : '');
        setToolsOpen(false);
        setMoveFeedback('');
        setEditing({ yearKey: view.yearKey, items: pinShelves(view.items, view.bookcase.model, BASE_WIDTH, shelfOptions), bookcase: view.bookcase, selectedKey: null, density });
    }

    return (
        <section className="year-shelf-view" aria-labelledby="year-shelf-title">
            {error && <Notice message={error} onRetry={retry} />}
            {!milestones && !error && <p role="status">{t('milestones.loading')}</p>}

            {booksStatus !== 'ready' ? (
                <p role="status">{t(booksStatus === 'error' ? 'library.shelf.booksError' : 'nightstand.loading')}</p>
            ) : (
                <>
                    <ShelfViewer views={views} viewport={viewport} density={density} currentYear={currentYear}
                        readingGoal={readingGoal} username={username} minHeight={caseHeight} onOrganize={organize} />

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
                                    {(saveError || editing?.unplaced?.length > 0) && <div className="year-shelf-placement-notice"><Notice message={saveError || t('library.shelf.placement.unplaced')} /></div>}
                                </header>

                                <div className={'year-shelf-zoom-body' + (toolsOpen ? ' has-open-tools' : '')} ref={zoomBodyRef}>
                                    <ShelfRow
                                        items={openView.items}
                                        bookcase={openView.bookcase}
                                        width={zoomWidth}
                                        immersive
                                        unified
                                        minHeight={caseHeight}
                                        density={density}
                                        decorationWidth={decorationWidth}
                                        label={t('library.shelf.yearLabel', { year: openView.label })}
                                        emptyText={t('library.shelf.empty')}
                                        editing={openView.isEditing}
                                        selectedKey={openView.isEditing ? editing.selectedKey : null}
                                        onSelect={selectItem}
                                        onMove={move}
                                        onCheckMove={(from, to, before, shelf) => {
                                            const issue = checkMove(from, to, before, shelf);
                                            return issue ? issueMessage(issue) : null;
                                        }}
                                    />

                                    {openView.isEditing && (
                                        <details className="year-shelf-editor-drawer" open={viewport > 900 || toolsOpen}
                                            onToggle={event => { if (viewport <= 900) setToolsOpen(event.currentTarget.open); }}>
                                            <summary>{t('library.shelf.customize')}</summary>
                                            <ShelfEditor
                                                item={openView.selectedIndex >= 0 ? openView.items[openView.selectedIndex] : null}
                                                isFirst={Number.isFinite(openView.items[openView.selectedIndex]?.x)
                                                    ? openView.items[openView.selectedIndex].x <= 0
                                                    : openView.selectedIndex <= 0 || openView.items[openView.selectedIndex - 1]?.shelf !== openView.items[openView.selectedIndex]?.shelf}
                                                isLast={Number.isFinite(openView.items[openView.selectedIndex]?.x)
                                                    ? openView.items[openView.selectedIndex].x >= 1
                                                    : openView.selectedIndex === openView.items.length - 1 || openView.items[openView.selectedIndex + 1]?.shelf !== openView.items[openView.selectedIndex]?.shelf}
                                                shelfCount={shelfCapacity(openView.items)}
                                                feedback={moveFeedback}
                                                canTop={openView.selectedIndex >= 0 && canSitOnPile(openView.items, editing.selectedKey)}
                                                tray={unlocked.filter((name) => !openView.items.some((item) => item.name === name))}
                                                saving={saving}
                                                error={saveError}
                                                onMoveBy={nudgeSelected}
                                                onSpot={(x) => changeSelected({ x })}
                                                onShelf={moveSelectedToShelf}
                                                onPose={(pose) => changeSelected(pose === 'flat' ? { pose, x: null } : { pose })}
                                                onTone={(tone) => changeSelected({ tone, color: null })}
                                                onColor={(color) => changeSelected({ color })}
                                                onFace={(face) => changeSelected({ face })}
                                                bookcase={openView.bookcase}
                                                onBookcase={(next) => {
                                                    const issue = placementIssue(editing.items, next.model, shelfOptions);
                                                    if (issue) { setSaveError(issueMessage(issue)); return; }
                                                    setSaveError('');
                                                    setEditing({ ...editing, bookcase: next });
                                                }}
                                                onRemove={removeSelected}
                                                onAdd={addDecoration}
                                                onSave={save}
                                                onCancel={closeYear}
                                            />
                                        </details>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}

            {milestones && (
                <details className="year-shelf-rewards">
                    <summary className="display" id="year-shelf-rewards-title">{t('library.shelf.rewards')}</summary>
                    <ul className="year-shelf-reward-list">
                        {DECORATIONS.map(({ name, milestone, member, free }) => {
                            const achieved = unlocked.includes(name);

                            return (
                                <li key={name} className={achieved ? '' : 'year-shelf-locked'}>
                                    <ShelfDecoration name={name} />
                                    <div>
                                        <strong>{t('library.shelf.objects.' + name)}</strong>
                                        <span>{t(achieved ? 'library.shelf.unlocked' : 'library.shelf.locked')}</span>
                                        <small>
                                            {free ? t('library.shelf.freeRule') : member ? (
                                                isMember ? t('library.shelf.memberRule') : <Link to="/membership">{t('library.shelf.join')}</Link>
                                            ) : t('milestones.items.' + milestone + '.rule')}
                                        </small>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                    <Link to="/achievements">{t('celebration.seeAll')}</Link>
                </details>
            )}
        </section>
    );
}

export default YearShelf;
