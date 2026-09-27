import { useState, useEffect, useRef } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation, Link } from 'react-router-dom'
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
import Icon from './Icon';
import { apiFetch } from './api';
import BookModal from './BookModal';
import Notice from './Notice';

function App() {
  const [books, setBooks] = useState([])
  const [booksStatus, setBooksStatus] = useState('loading');
  const [booksError, setBooksError] = useState('');
  const [toast, setToast] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

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
    fetch('http://localhost:3000/api/me', {
      credentials: 'include',
    })
      .then((res) => {
        if (res.ok) {
          return res.json();
        }
        return null;
      })
      .then((user) => {
        setCurrentUser(user);
      });
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
      body: { isFavorite: isFavorite ? 0 : 1 },
    })
      .then(() => loadUserBooks())
      .catch((error) => setToast(error.message));
  };

  const handleLogout = () => {
    apiFetch('/api/Logout', { method: 'POST' })
      .then(() => {
        setCurrentUser(null);
        navigate('/');
      })
      .catch((error) => setToast(error.message));
  };

  const handleLogin = (user) => {
    setCurrentUser(user);
    navigate('/');
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const term = searchTerm.trim();
    if (term === '') return;
    navigate(`/?q=${encodeURIComponent(term)}`);
  };

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

  return (
    <div className="app-shell">
      <Sidebar />

      <div className="app-main">
        <header className="topbar">
          <form className="topbar-search" onSubmit={handleSearch}>
            <Icon name="search" size={18} />
            <input
              type="text"
              placeholder="Search by title or author..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Search books"
            />
            <button type="submit" className="pill topbar-search-button">Search</button>
          </form>

          <div className="header-user-wrap" ref={menuRef}>
            <button className="header-user" onClick={() => setShowUserMenu(!showUserMenu)}>
              <span className="header-user-name">hi, {currentUser.displayName}</span>
              <span className="header-avatar">
                <img
                  src={currentUser.avatarUrl
                    ? `http://localhost:3000${currentUser.avatarUrl}`
                    : '/default-avatar.png'}
                  alt=""
                />
              </span>
            </button>

            {showUserMenu && (
              <div className="header-menu">
                <Link
                  to="/profile/edit"
                  className="ghost-button"
                  onClick={() => setShowUserMenu(false)}
                >
                  Edit profile
                </Link>
                <button className="ghost-button" onClick={handleLogout}>
                  Log out
                </button>
              </div>
            )}
          </div>
        </header>

        {booksStatus === 'error' && (
          <Notice message={booksError} onRetry={retryBooks} />
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
          <Route path="/reading" element={<ReadingPage books={books} onUpdate={loadUserBooks} />} />
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