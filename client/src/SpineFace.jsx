import './SpineFace.css';

function SpineFace({ title, cover, solid }) {
    const hasCover = Boolean(cover) && !solid;
    const coverStyle = hasCover ? { backgroundImage: 'url(' + JSON.stringify(cover) + ')' } : undefined;

    return (
        <span className="spine-face" data-cover={hasCover || undefined} style={coverStyle} aria-hidden="true">
            <span className="spine-body" data-solid={solid || undefined}>
                <span className="spine-title">{title}</span>
            </span>
        </span>
    );
}

export default SpineFace;
