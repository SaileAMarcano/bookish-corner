import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ShelfRow from './ShelfRow';
import BookCover from './BookCover';
import LibraryYearChallenge from './LibraryYearChallenge';
import Icon from './Icon';
import { BASE_WIDTH, layoutCases } from './bookcases';
import { groupItems } from './shelfUtils';
import { SPINE_COLORS, genreLook, isLightColor } from './shelfSpines';

function members(row) {
    return row.groups.flatMap(group => group.type === 'pile' ? group.items : [group]);
}

function readAmbience(username) {
    try {
        const saved = JSON.parse(localStorage.getItem('bookshelf-ambience:' + username));
        return { warm: saved?.warm !== false, strings: saved?.strings !== false,
            intensity: Number.isFinite(saved?.intensity) ? Math.max(0, Math.min(100, saved.intensity)) : 72 };
    } catch {
        return { warm: true, strings: true, intensity: 72 };
    }
}

function ShelfViewer({ views, viewport, density, currentYear, readingGoal, username, minHeight, onOrganize }) {
    const { t } = useTranslation();
    const [year, setYear] = useState(null);
    const [shelf, setShelf] = useState(0);
    const [bookKey, setBookKey] = useState(null);
    const [mobileView, setMobileView] = useState('shelves');
    const [width, setWidth] = useState(600);
    const [ambience, setAmbience] = useState(() => readAmbience(username));
    const inspectorRef = useRef(null);
    const ambienceRef = useRef(null);
    const stackRef = useRef(null);
    const mobile = viewport <= 860;
    const view = views.find(item => item.yearKey === year) || views[0];
    const rows = layoutCases(groupItems(view.items), view.bookcase.model, BASE_WIDTH, { immersive: true, density, minHeight }).flat();
    const shelfIndex = Math.min(shelf, rows.length - 1);
    const row = rows[shelfIndex];
    const selected = view.items.find(item => item.type === 'book' && item.key === bookKey)
        || members(row).find(item => item.type === 'book') || view.items.find(item => item.type === 'book');
    const selectedCount = members(row).filter(item => item.type === 'book').length;
    const selectedFill = selected ? selected.color || SPINE_COLORS[selected.tone ?? genreLook(selected.book, 0).tone].hex : null;
    const yearCount = view.yearBooks.length;
    const mapWidth = mobile ? Math.min(230, viewport - 110) : 190;

    useEffect(() => {
        const inspector = inspectorRef.current;
        if (!inspector) return undefined;
        const observer = new ResizeObserver(([entry]) => {
            if (entry.contentRect.width > 0) setWidth(entry.contentRect.width);
        });
        observer.observe(inspector);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem('bookshelf-ambience:' + username, JSON.stringify(ambience));
        } catch {
            return;
        }
    }, [ambience, username]);

    useEffect(() => {
        function close(event) {
            const details = ambienceRef.current;
            if (!details?.open) return;
            if (event.type === 'keydown' && event.key === 'Escape') {
                details.open = false;
                details.querySelector('summary').focus();
            } else if (event.type === 'pointerdown' && !details.contains(event.target)) details.open = false;
        }
        document.addEventListener('pointerdown', close);
        document.addEventListener('keydown', close);
        return () => {
            document.removeEventListener('pointerdown', close);
            document.removeEventListener('keydown', close);
        };
    }, []);

    function chooseShelf(index) {
        setShelf(index);
        setBookKey(null);
        setMobileView('shelves');
        if (mobile) requestAnimationFrame(() => {
            stackRef.current?.querySelector('[data-focus-shelf="' + index + '"]')?.scrollIntoView({ block: 'nearest', behavior: 'auto' });
        });
    }

    function chooseBook(key) {
        setBookKey(key);
        const destination = rows.findIndex(item => members(item).some(book => book.key === key));
        if (destination >= 0) setShelf(destination);
    }

    const shelfProps = { items: view.items, bookcase: view.bookcase, immersive: true, unified: true,
        density, ambience, minHeight, focusShelf: shelfIndex, selectedKey: selected?.key,
        label: t('library.shelf.yearLabel', { year: view.label }), onBookSelect: chooseBook };

    return (
        <div className="bookshelf-viewer" data-mobile-view={mobileView}>
            <header className="bookshelf-header">
                <h1 className="display" id="year-shelf-title">{t('nav.myBookshelf')}</h1>
                <div className="bookshelf-header-actions">
                    <details className="bookshelf-ambience" ref={ambienceRef}>
                        <summary className="bookshelf-icon" aria-label={t('library.shelf.viewer.ambience')}><Icon name="settings" size={19} /></summary>
                        <div className="bookshelf-ambience-panel">
                            <h2 className="display">{t('library.shelf.viewer.ambience')}</h2>
                            <label htmlFor="shelf-warmth">{t('library.shelf.viewer.intensity')} <span>{ambience.intensity}%</span></label>
                            <input id="shelf-warmth" aria-label={t('library.shelf.viewer.intensity')} type="range" min="0" max="100" step="1" value={ambience.intensity}
                                onChange={event => setAmbience({ ...ambience, intensity: Number(event.target.value), warm: Number(event.target.value) > 0 })} />
                            <label className="bookshelf-check"><input type="checkbox" checked={ambience.strings}
                                onChange={event => setAmbience({ ...ambience, strings: event.target.checked })} />{t('library.shelf.viewer.strings')}</label>
                            {view.canOrganize && <button className="year-shelf-button" type="button" onClick={() => { ambienceRef.current.open = false; onOrganize(view); }}>{t('library.shelf.viewer.customizeCase')}</button>}
                            <button className="year-shelf-button" type="button" onClick={() => { ambienceRef.current.open = false; ambienceRef.current.querySelector('summary').focus(); }}>{t('library.shelf.viewer.done')}</button>
                        </div>
                    </details>
                    {view.canOrganize && <button className="year-shelf-button year-shelf-save" type="button" aria-label={t('library.shelf.organize')} onClick={() => onOrganize(view)}><Icon name="pencil" size={16} />{t('library.shelf.viewer.organize')}</button>}
                </div>
            </header>

            <div className="bookshelf-context">
                <select value={view.yearKey} aria-label={t('library.shelf.viewer.chooseYear')} onChange={event => { setYear(Number(event.target.value)); setShelf(0); setBookKey(null); }}>
                    {views.map(item => <option key={item.yearKey} value={item.yearKey}>{item.label}</option>)}
                </select>
                <span>{t('library.bookCount', { count: yearCount })}</span>
                {view.year === currentYear && readingGoal > 0 && <details className="bookshelf-challenge">
                    <summary><Icon name="sparkle" size={15} />{yearCount}/{readingGoal}</summary>
                    <LibraryYearChallenge year={currentYear} count={yearCount} readingGoal={readingGoal} />
                </details>}
                <button type="button" className="year-shelf-button bookshelf-warm-toggle" aria-pressed={ambience.warm}
                    onClick={() => setAmbience({ ...ambience, warm: !ambience.warm })}><Icon name="sun" size={16} />{t('library.shelf.viewer.warm')}</button>
            </div>

            <div className="bookshelf-mobile-tabs" role="group" aria-label={t('library.shelf.viewLabel')}>
                <button className="year-shelf-button" type="button" aria-pressed={mobileView === 'map'} onClick={() => setMobileView('map')}><Icon name="library" size={16} />{t('library.shelf.bookcase')}</button>
                <button className="year-shelf-button" type="button" aria-pressed={mobileView === 'shelves'} onClick={() => setMobileView('shelves')}><Icon name="reading" size={16} />{t('library.shelf.viewer.shelves')}</button>
            </div>

            <div className="bookshelf-layout">
                <section className="bookshelf-map" aria-label={t('library.shelf.viewer.fullCase')}>
                    <h2 className="display">{t('library.shelf.viewer.fullCase')}</h2>
                    <p className="bookshelf-case-label">{t('library.shelf.bookcases.' + view.bookcase.model)} · {t('library.shelf.caseColors.' + view.bookcase.model + '-' + view.bookcase.color)}</p>
                    <ShelfRow {...shelfProps} width={mapWidth} onShelfChange={chooseShelf} />
                </section>

                <section className="bookshelf-inspector" ref={inspectorRef} aria-label={t('library.shelf.viewer.inspector')}>
                    <header className="bookshelf-reading-head">
                        <h2 className="display">{t('library.shelf.shelfNumber', { number: shelfIndex + 1 })}</h2>
                        <span>{t('library.bookCount', { count: selectedCount })}</span>
                        <button className="bookshelf-icon" type="button" aria-label={t('library.shelf.viewer.previous')} disabled={shelfIndex === 0} onClick={() => chooseShelf(shelfIndex - 1)}><Icon name="arrowLeft" size={17} /></button>
                        <button className="bookshelf-icon" type="button" aria-label={t('library.shelf.viewer.next')} disabled={shelfIndex >= rows.length - 1} onClick={() => chooseShelf(shelfIndex + 1)}><Icon name="arrowRight" size={17} /></button>
                    </header>
                    <div className="bookshelf-stack" ref={stackRef}>
                        <ShelfRow {...shelfProps} width={width} mode={mobile ? 'rows' : 'row'} />
                    </div>
                    {!view.yearBooks.length && <p className="bookshelf-empty">{t('library.shelf.empty')}</p>}
                    {selected && <div className="bookshelf-selected" aria-live="polite">
                        <div className="bookshelf-selected-cover" style={{ '--selected-fill': selectedFill, '--selected-ink': isLightColor(selectedFill) ? '#2D241F' : '#FAF4E8' }}><BookCover src={selected.book.coverImage} title={selected.book.title} author={selected.book.author} bookId={selected.book.bookId} /></div>
                        <div className="bookshelf-selected-copy">
                            <span className="bookshelf-eyebrow">{t('library.shelf.viewer.selected')}</span>
                            <h3 className="display">{selected.book.title}</h3>
                            <p>{selected.book.author}</p>
                            <Link className="year-shelf-button" to={'/book/' + selected.book.bookId}>{t('library.shelf.viewer.openBook')}<Icon name="arrowRight" size={15} /></Link>
                        </div>
                    </div>}
                </section>
            </div>
        </div>
    );
}

export default ShelfViewer;
