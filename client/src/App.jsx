import { useState, useEffect } from 'react'
import BookItem from './BookItem'
import './App.css'
import AuthForm from './AuthForm';
import Profile from './Profile';

function App() {
  const [books, setBooks] = useState([])
  const [currentUser, setCurrentUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

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
    });
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim() === '') return;

    setIsSearching(true);

    fetch(`http://localhost:3000/api/search-books?q=${encodeURIComponent(searchTerm)}`)
      .then((res) => res.json())
      .then((data) => {
        setSearchResults(data);
        setIsSearching(false);
      });
  };

  const handleAddBook = (book) => {
    fetch('http://localhost:3000/api/user-books/from-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        openLibraryKey: book.openLibraryKey,
        title: book.title,
        author: book.author,
        coverImage: book.coverImage,
      }),
    }).then(() => {
      loadUserBooks();
      setSearchTerm('');
      setSearchResults([]);
    });
  };

  if (!currentUser) {
    return <AuthForm onLogin={setCurrentUser} />;
  }

  const alreadyAddedKeys = books.map((b) => b.openLibraryKey);

  return (
    <div>
      <header className="site-header">
        <div className="display logo">Bookish Corner</div>
        <nav>
          <a href="#" className="active">Home</a>
          <a href="#">Currently Reading</a>
          <a href="#">About</a>
        </nav>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            style={{
              fontSize: '13px',
              color: 'var(--text-2)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            hi, {currentUser.username}
          </button>

          {showUserMenu && (
            <div
              style={{
                position: 'absolute',
                top: '30px',
                right: 0,
                background: 'white',
                border: '1px solid #ddd',
                borderRadius: '8px',
                padding: '8px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                zIndex: 10,
              }}
            >
              <button onClick={() => {
                setShowProfile(true);
                setShowUserMenu(false);
              }}
                className="like-button">Edit Profile</button>
              <button onClick={handleLogout} className="like-button">Log out</button>
            </div>
          )}
        </div>
      </header>

      <main className="page">
        <div className="hero">
          <div className="display hero-eyebrow">Reviews, thoughts and favorite reads</div>
          <h1 className="display hero-title">A cozy corner for the books I can't stop thinking about</h1>
        </div>

        <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div className="section-label">Add a book</div>
          <form className="comment-form" onSubmit={handleSearch}>
            <input
              type="text"
              placeholder="Search by tittle or author..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="comment-input" />
            <button type="submit" className="comment-button">Search</button>
          </form>
          {isSearching && <div className="search-empty"> Searching...</div>}

          {isSearching && <div className="search-empty"> Searching...</div>}

          {!isSearching && searchResults.map((book) => (
            <div key={book.openLibraryKey} className="search-result">
              {book.coverImage ? (
                <img className="search-cover" src={book.coverImage} alt={book.title} />
              ) : (
                <div className="search-cover search-cover-empty"></div>
              )}

              <div className="search-info">
                <div className="search-title">{book.title}</div>
                <div className="search-author">
                  {book.author}{book.year ? ` · ${book.year}` : ''}
                </div>
              </div>

              {alreadyAddedKeys.includes(book.openLibraryKey) ? (
                <span className="search-added">Added</span>
              ) : (
                <button className="comment-button" onClick={() => handleAddBook(book)}>Add</button>
              )}
            </div>
          ))}
        </div>

        <div className="section-label">Currently Reading</div>

        <div className="section-label">Currently Reading</div>
        <div className="card currently-reading">
          <div className="currently-reading-cover"></div>
          <div className="currently-reading-info">
            <div className="display currently-reading-title">Metal Slinger</div>
            <div className="currently-reading-author">[Author name]</div>
            <div className="currently-reading-notes">[Notes go here once I'm further into the book]</div>

            <div className="progress">
              <div classame="progress-track">
                <div className="progress-fill" style={{ width: '62%' }}></div>
              </div>
              <div className="progress-label">62% complete</div>
            </div>
          </div>
        </div>

        <div className="section-label">All Reviews</div>
        <div className="grid">
          {books.map((book) => (
            <BookItem key={book.id} book={book} onLike={handleLike} onUpdate={loadUserBooks} />
          ))}
        </div>
      </main >

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
    </div >
  )
}

export default App