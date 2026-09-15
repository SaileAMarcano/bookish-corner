import { useState, useEffect } from 'react'
import BookItem from './BookItem'
import './App.css'

function App() {
  const [books, setBooks] = useState([])


  useEffect(() => {
    fetch('http://localhost:3000/api/books')
      .then((res) => res.json())
      .then((data) => setBooks(data))
  }, [])

  const handleLike = (bookId) => {
    fetch(`http://localhost:3000/api/books/${bookId}/like`, {
      method: 'POST',
    })
      .then((res) => res.json())
      .then((updateBook) => {
        setBooks((prevBooks) =>
          prevBooks.map((book) =>
            book.id === bookId ? updateBook : book
          )
        )
      })
  }

  return (
    <div>
      <h1>Bookish Corner</h1>
      <ul>
        {books.map((book) => (
          <BookItem key={book.id} book={book} onLike={handleLike} />
        ))}
      </ul>
    </div>
  )
}

export default App