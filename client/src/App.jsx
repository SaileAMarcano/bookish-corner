import { useState, useEffect, useRef } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation, Link } from 'react-router-dom'
import './App.css'
import Home from './Home';
import ProfilePage from './ProfilePage';
import EditProfile from './EditProfile';
import AuthForm from './AuthForm';
import Landing from './Landing';
import Sidebar from './Sidebar';
import ReadingPage from './ReadingPage';
import Icon from './Icon';

function App() {
  const [books, setBooks] = useState([])
  const [currentUser, setCurrentUser] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const loadUserBooks = () => {
    fetch('http://localhost:3000/api/user-books', {
      credentials: 'include',
    })
      .then((res) => res.json())
      .then((data) => setBooks(data));
  };

  useEffect(() => {
    if (!currentUser) return;
    loadUserBooks();
  }, [currentUser]);

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
    fetch(`http://localhost:3000/api/user-books/${userBookId}/like`, {
      method: alreadyLiked ? 'DELETE' : 'POST',
      credentials: 'include',
    }).then(() => {
      loadUserBooks();
    });
  };

  const handleToggleFavorite = (userBookId, isFavorite) => {
    fetch(`http://localhost:3000/api/user-books/${userBookId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ isFavorite: isFavorite ? 0 : 1 }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Could not update favorite');
        return res.json();
      })
      .then(() => {
        loadUserBooks();
      })
      .catch((error) => {
        console.error(error);
      });
  };

  const handleLogout = () => {
    fetch('http://localhost:3000/api/logout', {
      method: 'POST',
      credentials: 'include',
    }).then(() => {
      setCurrentUser(null);
      navigate('/');
    });
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
        <Route path="/login" element={<AuthForm onLogin={(user) => {
          setCurrentUser(user);
          navigate('/');
        }} />} />
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

        <Routes>
          <Route
            path="/"
            element={
              <Home
                books={books}
                currentUser={currentUser}
                onUpdate={loadUserBooks}
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
          <Route path="/reading" element={<ReadingPage books={books} />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </div>
  )
}

export default App