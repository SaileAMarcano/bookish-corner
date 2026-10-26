import { useTranslation } from 'react-i18next';
import { spotifyEmbed } from './utils';

function SpotifyPlayer({ url }) {
    const { t } = useTranslation();
    const embed = spotifyEmbed(url);
    if (!embed) return null;

    return (
        <iframe
            className="spotify-player"
            src={embed.src}
            title={t('posts.spotifyPlayer')}
            height={embed.type === 'track' ? 80 : 152}
            loading="lazy"
            allow="clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        />
    );
}

export default SpotifyPlayer