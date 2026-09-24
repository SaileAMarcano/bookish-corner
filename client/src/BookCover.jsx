import { useState } from 'react';

function BookCover({ src, className }) {
    const [failed, setFailed] = useState(false);

    if (src && src.startsWith('http') && !failed) {
        return <img className={className} src={src} alt="" onError={() => setFailed(true)} />
    }

    return <div className={`${className} cover-empty`}></div>
}

export default BookCover