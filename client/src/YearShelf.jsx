import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LibraryYearChallenge from './LibraryYearChallenge';
import ShelfDecoration from './ShelfDecoration';
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
const COLORS = ['#59644f', '#655a7c', '#825563', '#495777', '#72516a', '#76633f'];

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
                            {yearBooks.map((book) => {
                                const tone = getCoverTone(book.bookId || book.title);
                                const label = [book.title, book.author].filter(Boolean).join(' · ');

                                return (
                                    <Link key={book.id} to={'/book/' + book.bookId} className="year-shelf-spine"
                                        style={{ '--spine-color': COLORS[tone], '--spine-height': (144 + tone * 7) + 'px' }}
                                        title={label} aria-label={label}>
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