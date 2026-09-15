import { useState, useEffect } from 'react'

function BookItem({ book, onLike }) {
    const [comments, setComments] = useState([])
    const [commentText, setCommentText] = useState('')

    useEffect(() => {
        fetch(`http://localhost:3000/api/books/${book.id}/comments`)
            .then((res) => res.json())
            .then((data) => setComments(data))
    }, [book.id])

    const handleAddComment = () => {
        if (commentText.trim() === '') return

        fetch(`http://localhost:3000/api/books/${book.id}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: commentText }),
        })

            .then((res) => res.json())
            .then((newComment) => {
                setComments((prevComments) => [newComment, ...prevComments])
                setCommentText('')
            })
    }

    return (
        <li>
            <h2>{book.title}</h2>
            <p>{book.author}</p>
            <p>{book.description}</p>
            <button onClick={() => onLike(book.id)}>❤️ {book.likes}</button>

            <div>
                <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Write a comment..."
                />
                <button onClick={handleAddComment}>Comment</button>
            </div>

            <ul>
                {comments.map((comment) => (
                    <li key={comment.id}>{comment.text}</li>
                ))}
            </ul>
        </li>
    )
}

export default BookItem