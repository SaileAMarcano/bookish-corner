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
import { apiFetch } from './api';
import { getAvatarSrc } from './utils';
import BookModal from './BookModal';
import Notice from './Notice';
import Welcome from './Welcome';
import SearchPanel from './SearchPanel';
import SearchBox from './SearchBox';
import LanguageSwitcher from './LanguageSwitcher';
import i18n from './i18n';

// A logged-in user's saved language wins over the one chosen on this browser.
function applyUserLanguage(user) {
  if (user.language && user.language !== i18n.language) {
    i18n.changeLanguage(user.language);
  }
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

  // The search lives in the URL (?q=) of the page you are on, so it never sends you to Home.
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

  // The switcher already changed the language on screen; here it is saved in the profile.
  const handleLanguageChange = (language) => {
    setCurrentUser((user) => ({ ...user, language }));
    apiFetch('/api/me/language', { method: 'PATCH', body: { language } })
      .catch((error) => setToast(error.message));
  };

  const handleSearch = (term) => {
    // Keeps the rest of the URL (for example ?tab=favorites) and only adds q.
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
      <Sidebar />

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

          <div className="header-user-wrap" ref={menuRef}>
            <button className="header-user" onClick={() => setShowUserMenu(!showUserMenu)}>
              <span className="header-user-name">{t('app.hi', { name: currentUser.displayName })}</span>
              <span className="header-avatar">
                <img
                  src={getAvatarSrc(currentUser.avatarUrl)}
                  alt=""
                />
              </span>
            </button>

            {showUserMenu && (
              <div className="header-menu">
                <LanguageSwitcher onChange={handleLanguageChange} />
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
                onError={setToast}
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
          <Route path="/reading" element={<ReadingPage books={books} onUpdate={loadUserBooks} booksStatus={booksStatus} />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  )
}

export default App