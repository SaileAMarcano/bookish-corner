import { useState } from 'react';
import { getCoverTone } from './libraryUtils';

function BookCover({ src, className = '', title = '', author = '', bookId }) {
    const [failedSrc, setFailedSrc] = useState(null);

    if (typeof src === 'string' && src.startsWith('http') && src !== failedSrc) {
        return <img className={className} src={src} alt="" onError={() => setFailedSrc(src)} />;
    }

    return (
        <div
            className={`${className} ${title ? 'cover-fabric' : 'cover-empty'}`}
            data-tone={title ? getCoverTone(bookId ?? `${title}|${author}`) : undefined}
            aria-hidden="true"
        >
            {title && (
                <>
                    <span className="cover-fabric-star">✦</span>
                    <strong className="cover-fabric-title">{title}</strong>
                    {author && <span className="cover-fabric-author">{author}</span>}
                </>
            )}
        </div>
    );
}

export default BookCover;