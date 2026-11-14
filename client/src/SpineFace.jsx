import Icon from './Icon';
import './SpineFace.css';

const MOTIF_ICONS = {
    star: 'sparkle',
    heart: 'favorites',
    flower: 'flower',
    quill: 'feather',
    key: 'key',
    planet: 'planet',
    moon: 'moon',
    hourglass: 'hourglass',
    leaf: 'leaf',
    bubble: 'comment',
};

export function SpineMotif({ motif, className = 'spine-motif' }) {
    return <Icon name={MOTIF_ICONS[motif] || 'sparkle'} className={className} size={20} />;
}

function SpineFace({ title, cover, solid, motif }) {
    const hasCover = Boolean(cover) && !solid;
    const coverStyle = hasCover ? { backgroundImage: 'url(' + JSON.stringify(cover) + ')' } : undefined;

    return (
        <span className="spine-face" data-cover={hasCover || undefined} style={coverStyle} aria-hidden="true">
            <span className="spine-cap">
                <SpineMotif motif={motif} />
            </span>
            <span className="spine-body" data-solid={solid || undefined}>
                <span className="spine-title">{title}</span>
            </span>
        </span>
    );
}

export default SpineFace;
