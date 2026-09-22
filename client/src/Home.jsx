import { useState } from "react";
import BookItem from "./BookItem";


function Home({ books, onLike, onUpdate, onToggleFavorite }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

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
            onUpdate();
            setSearchTerm('');
            setSearchResults([]);
        });
    };

    const alreadyAddedKeys = books.map((b) => b.openLibraryKey);

    return (
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
                        placeholder="Search by title or author..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="comment-input" />
                    <button type="submit" className="comment-button">Search</button>
                </form>

                {isSearching && <div className="search-empty">Searching...</div>}

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
            <div className="card currently-reading">
                <div className="currently-reading-cover"></div>
                <div className="currently-reading-info">
                    <div className="display currently-reading-title">Metal Slinger</div>
                    <div className="currently-reading-author">[Author name]</div>
                    <div className="currently-reading-notes">[Notes go here once I'm further into the book]</div>

                    <div className="progress">
                        <div className="progress-track">
                            <div className="progress-fill" style={{ width: '62%' }}></div>
                        </div>
                        <div className="progress-label">62% complete</div>
                    </div>
                </div>
            </div>

            <div className="section-label">All Reviews</div>
            <div className="grid">
                {books.map((book) => (
                    <BookItem key={book.id} book={book} onLike={onLike} onUpdate={onUpdate} onToggleFavorite={onToggleFavorite} />
                ))}
            </div>
        </main>
    );
}

export default Home