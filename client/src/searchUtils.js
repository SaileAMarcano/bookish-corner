export function searchBookKey(book) {
    return book.openLibraryKey || `book-${book.bookId}`;
}

export function libraryMatch(book, books) {
    return books.find((item) => (book.bookId != null && item.bookId === book.bookId)
        || (book.openLibraryKey && item.openLibraryKey === book.openLibraryKey));
}
