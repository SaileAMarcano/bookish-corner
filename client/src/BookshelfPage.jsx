import YearShelf from './YearShelf';
import './BookshelfPage.css';

function BookshelfPage(props) {
    return <main className="page bookshelf-page"><YearShelf {...props} /></main>;
}

export default BookshelfPage;
