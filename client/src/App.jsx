import { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate, NavLink } from 'react-router-dom'
import './App.css'
import Home from './Home';
import ProfilePage from './ProfilePage';
import AuthForm from './AuthForm';
import Profile from './Profile';
import Landing from './Landing';

function App() {
  const [books, setBooks] = useState([])
  const [currentUser, setCurrentUser] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [profileVersion, setProfileVersion] = useState(0);
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

  const closeProfileDrawer = () => {
    setShowProfile(false);
    setProfileVersion((v) => v + 1);
    loadCurrentUser();
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
    <div>
      <header className="site-header">
        <div className="display logo">Bookish Corner</div>
        <nav>
          <NavLink to="/" end>Home</NavLink>
          <a href="#">Currently Reading</a>
          <NavLink to="/profile">Profile</NavLink>
        </nav>
        <div className="header-user-wrap">
          <button className="header-user" onClick={() => setShowUserMenu(!showUserMenu)}>
            <span className="header-user-name">Hi, {currentUser.username}</span>
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
              <button className="ghost-button" onClick={() => {
                setShowProfile(true);
                setShowUserMenu(false);
              }}
              >
                Edit profile
              </button>
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
              onLike={handleLike}
              onUpdate={loadUserBooks}
              onToggleFavorite={handleToggleFavorite}
            />
          }
        />
        <Route
          path="/profile"
          element={
            <ProfilePage
              version={profileVersion}
              onEditProfile={() => setShowProfile(true)}
              books={books}
              onLike={handleLike}
              onUpdate={loadUserBooks}
              onToggleFavorite={handleToggleFavorite}
            />
          }
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>

      {showProfile && (
        <div className="drawer-overlay" onClick={closeProfileDrawer}>
          <div className="drawer" onClick={(e) => e.stopPropagation()}>
            <button className="drawer-close" onClick={closeProfileDrawer} aria-label="Close">
              <svg width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round">
                <line x1="5" y1="5" x2="19" y2="19" />
                <line x1="19" y1="5" x2="5" y2="19" />
              </svg>
            </button>

            <Profile onSaved={closeProfileDrawer} />
          </div>
        </div>
      )}
    </div>
  )
}

export default App