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

  useEffect(() => {
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
  }, []);

  const handleLike = (userBookId, alreadyLiked) => {
    fetch(`http://localhost:3000/api/user-books/${userBookId}/like`, {
      method: alreadyLiked ? 'DELETE' : 'POST',
      credentials: 'include',
    }).then(() => {
      loadUserBooks();
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
            <span className="header-user-name">hi, {currentUser.username}</span>
            <span className="header-avatar">
              {currentUser.avatarUrl ? (
                <img src={`http://localhost:3000${currentUser.avatarUrl}`} alt="" />
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="8" r="3.8" />
                  <path d="M12 13.5c-4 0-7 2.4-7 5.4 0 .6.5 1.1 1.1 1.1h11.8c.6 0 1.1-.5 1.1-1.1 0-3-3-5.4-7-5.4z" />
                </svg>
              )}
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
        <Route path="/" element={
          <Home books={books} onLike={handleLike} onUpdate={loadUserBooks} />
        } />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>

      {showProfile && (
        <div className="drawer-overlay" onClick={() => setShowProfile(false)}>
          <div className="drawer" onClick={(e) => e.stopPropagation()}>
            <button className="drawer-close" onClick={() => setShowProfile(false)} aria-label="Close">
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

            <Profile />
          </div>
        </div>
      )}
    </div>
  )
}

export default App