import { useState, useEffect, useRef } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation, useSearchParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import './App.css'
import Home from './Home';
import ProfilePage from './ProfilePage';
import EditProfile from './EditProfile';
import AuthPage from './AuthPage';
import Landing from './Landing';
import AboutPage from './AboutPage';
import FeaturesPages from './FeaturesPage';
import Sidebar from './Sidebar';
import ReadingPage from './ReadingPage';
import LibraryPage from './LibraryPage';
import TaggedPage from './TaggedPage';
import TagsPage from './TagsPage';
import GenresPage from './GenresPage';
import GenrePage from './GenrePage';
import UserPage from './UserPage';
import BookPage from './BookPage';
import AchievementsPage from './AchievementsPage';
import MilestoneCelebration from './MilestoneCelebration';
import { apiFetch } from './api';
import { getAvatarSrc } from './utils';
import Icon from './Icon';
import BookModal from './BookModal';
import Notice from './Notice';
import Welcome from './Welcome';
import SearchPanel from './SearchPanel';
import SearchBox from './SearchBox';
import ThemePicker from './ThemePicker';
import LanguageSwitcher from './LanguageSwitcher';
import i18n from './i18n';

const SEASON_FAVICONS = {
  grimm: '/seasons/grimm/favicon.png',
};

function applyUserLanguage(user) {
  if (user.language && user.language !== i18n.language) {
    i18n.changeLanguage(user.language);
  }
}

function themeOf(user) {
  if (!user) return 'light';
  if (user.theme) return user.theme;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function App() {
  const { t } = useTranslation();
  const [books, setBooks] = useState([])
  const [booksStatus, setBooksStatus] = useState('loading');
  const [booksError, setBooksError] = useState('');
  const [toast, setToast] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [userStatus, setUserStatus] = useState('loading');
  const [userError, setUserError] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const navigate = useNavigate();

  const theme = themeOf(currentUser);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const seasonTheme = currentUser?.seasonTheme || 'classic';

  useEffect(() => {
    document.documentElement.dataset.season = seasonTheme;
    document.querySelector('link[rel="icon"]').href = SEASON_FAVICONS[seasonTheme] || '/logo-mark.png';
  }, [seasonTheme]);

  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get('q') || '';

  const loadUserBooks = () => {
    apiFetch('/api/user-books')
      .then((data) => {
        setBooks(data);
        setBooksStatus('ready');
      })
      .catch((error) => {
        setBooksError(error.message);
        setBooksStatus('error');
      });
  };

  const retryBooks = () => {
    setBooksStatus('loading');
    loadUserBooks();
  }

  useEffect(() => {
    if (!currentUser) return;
    loadUserBooks();
  }, [currentUser]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const loadCurrentUser = () => {
    apiFetch('/api/me')
      .then((user) => {
        applyUserLanguage(user);
        setCurrentUser(user);
        setUserStatus('ready');
      })
      .catch((error) => {
        if (error.status === 401) {
          setCurrentUser(null);
          setUserStatus('ready');
        } else {
          setUserError(error.message);
          setUserStatus('error');
        }
      });
  };

  const retryUser = () => {
    setUserStatus('loading')
    loadCurrentUser();
  };

  useEffect(() => {
    loadCurrentUser();
  }, []);

  const menuRef = useRef(null);
  const location = useLocation();
  useEffect(() => {
    if (!showUserMenu) return;

    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
    };

    const handleEscape = (e) => {
      if (e.key === 'Escape') setShowUserMenu(false);
    };

    document.addEventListener('pointerdown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('pointerdown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showUserMenu]);

  useEffect(() => {
    setShowUserMenu(false);
  }, [location]);

  const handleLike = (userBookId, alreadyLiked) => {
    apiFetch(`/api/user-books/${userBookId}/like`, {
      method: alreadyLiked ? 'DELETE' : 'POST',
    })

      .then(() => loadUserBooks())
      .catch((error) => setToast(error.message));
  };

  const handleToggleFavorite = (userBookId, isFavorite) => {
    apiFetch(`/api/user-books/${userBookId}`, {
      method: 'PATCH',
      body: { isFavorite: !isFavorite },
    })
      .then(() => loadUserBooks())
      .catch((error) => setToast(error.message));
  };

  const handleLogout = () => {
    apiFetch('/api/logout', { method: 'POST' })
      .then(() => {
        setCurrentUser(null);
        navigate('/');
      })
      .catch((error) => setToast(error.message));
  };

  const handleLogin = (user) => {
    applyUserLanguage(user);
    setCurrentUser(user);
    navigate('/');
  };

  const handleLanguageChange = (language) => {
    setCurrentUser((user) => ({ ...user, language }));
    apiFetch('/api/me/language', { method: 'PATCH', body: { language } })
      .catch((error) => setToast(error.message));
  };

  const handleThemeToggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setCurrentUser((user) => ({ ...user, theme: next }));
    apiFetch('/api/me/theme', { method: 'PATCH', body: { theme: next } })
      .catch((error) => setToast(error.message));
  };

  const handleSeasonThemeChange = (next) => {
    const previous = seasonTheme;
    setCurrentUser((user) => ({ ...user, seasonTheme: next }));
    apiFetch('/api/me/season-theme', { method: 'PATCH', body: { seasonTheme: next } })
      .catch((error) => {
        setCurrentUser((user) => ({ ...user, seasonTheme: previous }));
        setToast(error.message);
      });
  };

  const handleSearch = (term) => {
    setSearchParams((params) => {
      params.set('q', term);
      return params;
    });
  };

  const closeSearch = () => {
    setSearchParams((params) => {
      params.delete('q');
      return params;
    });
  };

  const handleBookAdded = () => {
    loadUserBooks();
    closeSearch();
  };

  if (userStatus === 'loading') {
    return <div className="app-status">{t('app.opening')}</div>;
  }

  if (userStatus === 'error') {
    return (
      <div className="app-status">
        <Notice message={userError} onRetry={retryUser} />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/features" element={<FeaturesPages />} />
        <Route path="/login" element={<AuthPage key="login" mode="login" onLogin={handleLogin} />} />
        <Route path="/signup" element={<AuthPage key="signup" mode="signup" onLogin={handleLogin} />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    );
  }

  if (!currentUser.readerType) {
    return <Welcome currentUser={currentUser} onDone={loadCurrentUser} onLanguageChange={handleLanguageChange} />;
  }

  return (
    <div className="app-shell">

      {seasonTheme === 'christmas' && (
        <video className="season-snow" autoPlay loop muted playsInline aria-hidden="true">
          <source src="/seasons/christmas/snow.webm" type="video/webm" />
          <source src="/seasons/christmas/snow.mp4" type="video/mp4" />
        </video>
      )}

      <Sidebar readingCount={books.filter((book) => book.status === 'reading').length} seasonTheme={seasonTheme} />

      <div className="app-main">
        <header className="topbar">
          <SearchBox
            q={q}
            books={books}
            onSubmit={handleSearch}
            onClear={closeSearch}
            onAdded={loadUserBooks}
            onError={setToast}
          />

          <div className="topbar-actions">
            <LanguageSwitcher onChange={handleLanguageChange} />
            <button type="button" className="theme-switch" role="switch" aria-checked={theme === 'dark'} aria-label={t('app.darkMode')} onClick={handleThemeToggle}>
              <Icon name="sun" size={16} />
              <span className='theme-switch-track'>
                <span className="theme-switch-thumb"></span>
              </span>
              <Icon name="moon" size={16} />
            </button>

            <div className="header-user-wrap" ref={menuRef}>
              <button
                type="button"
                className="header-user"
                onClick={() => setShowUserMenu(!showUserMenu)}
                aria-expanded={showUserMenu}
                aria-label={t('app.accountMenu')}>
                <span className="header-avatar">
                  <img src={getAvatarSrc(currentUser.avatarUrl)} alt="" />
                </span>
                <Icon name="chevronDown" size={16} />
              </button>

              {showUserMenu && (
                <div className="header-menu">
                  <div className="header-menu-extra">
                    <LanguageSwitcher onChange={handleLanguageChange} />
                    <button className="ghost-button theme-toggle" onClick={handleThemeToggle}>
                      <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={14} />
                      {theme === 'dark' ? t('app.lightMode') : t('app.darkMode')}
                    </button>
                  </div>
                  <ThemePicker current={seasonTheme} unlocked={currentUser.unlockedThemes || ['classic']} onChange={handleSeasonThemeChange} />
                  <Link
                    to="/profile/edit"
                    className="ghost-button"
                    onClick={() => setShowUserMenu(false)}
                  >
                    {t('app.editProfile')}
                  </Link>
                  <button className="ghost-button" onClick={handleLogout}>
                    {t('app.logout')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {booksStatus === 'error' && (
          <Notice message={booksError} onRetry={retryBooks} />
        )}

        {q && (
          <div className="page search-page">
            <SearchPanel
              key={q}
              q={q}
              books={books}
              onAdded={handleBookAdded}
              onError={setToast}
              onClose={closeSearch}
            />
          </div>
        )}

        <Routes>
          <Route
            path="/"
            element={
              <Home
                books={books}
                currentUser={currentUser}
                onUpdate={loadUserBooks}
                booksStatus={booksStatus}
              />
            }
          />
          <Route
            path="/profile"
            element={
              <ProfilePage
                books={books}
                onLike={handleLike}
                onUpdate={loadUserBooks}
                onToggleFavorite={handleToggleFavorite}
              />
            }
          />
          <Route
            path="/profile/edit"
            element={<EditProfile onSaved={loadCurrentUser} />}
          />
          <Route path="/achievements" element={<AchievementsPage currentUser={currentUser} />} />
          <Route path="/tagged/:slug" element={<TaggedPage currentUser={currentUser} />} />
          <Route path="/tags" element={<TagsPage />} />
          <Route path="/genres" element={<GenresPage />} />
          <Route path="/genre/:slug" element={<GenrePage />} />
          <Route path="/u/:username" element={<UserPage currentUser={currentUser} />} />
          <Route path="/book/:id" element={<BookPage books={books} onLibraryChange={loadUserBooks} />} />
          <Route path="/reading" element={<ReadingPage books={books} onUpdate={loadUserBooks} booksStatus={booksStatus} />} />
          <Route path="/library" element={<LibraryPage books={books} onUpdate={loadUserBooks} booksStatus={booksStatus} />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}

      <MilestoneCelebration currentUser={currentUser} books={books} />
    </div>
  )
}

export default App
