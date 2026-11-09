import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LibraryYearChallenge from './LibraryYearChallenge';
import ShelfDecoration from './ShelfDecoration';
import SpineArt, { FlatSpineArt } from './SpineArt';
import Notice from './Notice';
import { apiFetch } from './api';
import { getCoverTone, groupReadBooks } from './libraryUtils';

const DECORATIONS = [
    { name: 'candle', milestone: 'first-chapter' },
    { name: 'quill', milestone: 'thoughtful-reader' },
    { name: 'stars', milestone: 'bookworm' },
    { name: 'flowers', milestone: 'genre-wanderer' },
    { name: 'tea', milestone: 'goal-reached' },
];
const SPINE_VARIANTS = 8;
const FLAT_VARIANTS = 4;
const PILE_EVERY = 7;
const PILE_AT = 3;

function hashOf(book) {
    let hash = 2166136261;
    for (const character of String(book.bookId || book.title || '')) {
        hash = Math.imul(hash ^ character.codePointAt(0), 16777619) >>> 0;
    }
    return hash;
}

function startsPile(index, total) {
    return index % PILE_EVERY === PILE_AT && total - index >= 2;
}

function getShelfItems(books) {
    const items = [];
    let previousLeans = false;
    let previousVariant = -1;

    for (let index = 0; index < books.length; index++) {
        const book = books[index];
        const hash = hashOf(book);
        const tone = getCoverTone(book.bookId || book.title || '');

        if (startsPile(index, books.length)) {
            const size = books.length - index >= 3 && hash % 2 === 0 ? 3 : 2;
            const pile = books.slice(index, index + size).map((item) => ({
                book: item,
                tone: getCoverTone(item.bookId || item.title || ''),
                variant: (hashOf(item) >>> 8) % FLAT_VARIANTS,
            }));
            items.push({ type: 'pile', key: 'pile-' + book.id, books: pile });
            index += size - 1;
            previousLeans = false;
            continue;
        }

        const nextIsPile = startsPile(index + 1, books.length);
        const leans = index < books.length - 1 && !nextIsPile && !previousLeans && hash % 5 === 0;
        previousLeans = leans;

        let variant = (hash >>> 8) % SPINE_VARIANTS;
        if (variant === previousVariant) variant = (variant + 1) % SPINE_VARIANTS;
        previousVariant = variant;

        items.push({ type: 'spine', key: book.id, book, leans, tone, variant });
    }

    return items;
}

function YearShelf({ books, booksStatus, readingGoal, username }) {
    const { t } = useTranslation();
    const [milestones, setMilestones] = useState(null);
    const [error, setError] = useState('');
    const [attempt, setAttempt] = useState(0);

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
    const unlocked = DECORATIONS.filter((decoration) =>
        milestones?.some((milestone) => milestone.key === decoration.milestone && milestone.achieved)
    );

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
            ) : groups.map(({ year, books: yearBooks }) => (
                <section className="year-shelf-card" key={year ?? 'undated'} aria-labelledby={'library-year-' + (year ?? 'undated')}>
                    {year === currentYear ? (
                        <LibraryYearChallenge year={year} count={yearBooks.length} readingGoal={readingGoal} />
                    ) : (
                        <h2 className="display library-year-heading" id={'library-year-' + (year ?? 'undated')}>
                            {year ?? t('library.undated')}
                            <span>· {t('library.bookCount', { count: yearBooks.length })}</span>
                        </h2>
                    )}

                    <div className="year-shelf-scroll" tabIndex={0} role="region" aria-label={t('library.shelf.yearLabel', { year: year ?? t('library.undated') })}>
                        <div className="year-shelf-stage">
                            {yearBooks.length === 0 && <p className="year-shelf-empty">{t('library.shelf.empty')}</p>}
                            {getShelfItems(yearBooks).map((item) => {
                                if (item.type === 'pile') {
                                    return (
                                        <div key={item.key} className="year-shelf-pile">
                                            {item.books.map(({ book, tone, variant }) => {
                                                const label = [book.title, book.author].filter(Boolean).join(' · ');

                                                return (
                                                    <Link key={book.id} to={'/book/' + book.bookId} className="year-shelf-flat"
                                                        style={{ '--spine-tone': 'var(--shelf-tone-' + tone + ')' }}
                                                        title={label} aria-label={label}>
                                                        <FlatSpineArt variant={variant} />
                                                        <span>{book.title}</span>
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    );
                                }

                                const { book, leans, tone, variant } = item;
                                const label = [book.title, book.author].filter(Boolean).join(' · ');

                                return (
                                    <Link key={item.key} to={'/book/' + book.bookId} className="year-shelf-spine"
                                        data-lean={leans || undefined}
                                        style={{ '--spine-tone': 'var(--shelf-tone-' + tone + ')' }}
                                        title={label} aria-label={label}>
                                        <SpineArt variant={variant} />
                                        <span>{book.title}</span>
                                    </Link>
                                );
                            })}
                            {unlocked.length > 0 && (
                                <div className="year-shelf-decorations">
                                    {unlocked.map(({ name }) => (
                                        <span key={name} role="img" aria-label={t('library.shelf.objects.' + name)}>
                                            <ShelfDecoration name={name} />
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </section>
            ))}

            {milestones && (
                <section className="year-shelf-rewards" aria-labelledby="year-shelf-rewards-title">
                    <h2 className="display" id="year-shelf-rewards-title">{t('library.shelf.rewards')}</h2>
                    <ul className="year-shelf-reward-list">
                        {DECORATIONS.map(({ name, milestone }) => {
                            const achieved = unlocked.some((decoration) => decoration.name === name);

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