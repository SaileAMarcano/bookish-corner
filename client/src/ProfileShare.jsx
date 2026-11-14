import { useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import QRCode from 'qrcode';
import Icon from './Icon';
import { drawProfileCard } from './profileCard';
import { getAvatarSrc } from './utils';

const STAR_PATH = 'M0-8c.6 5 3 7.4 8 8-5 .6-7.4 3-8 8-.6-5-3-7.4-8-8 5-.6 7.4-3 8-8Z';
const DIALOG_STARS = [
    [6, 8, 16, 'gold'], [94, 6, 12, 'rose'], [4, 34, 10, 'sage'], [96, 30, 18, 'gold'],
    [8, 58, 14, 'rose'], [93, 55, 10, 'sage'], [5, 84, 18, 'gold'], [95, 82, 14, 'rose'],
    [20, 3, 10, 'sage'], [80, 96, 12, 'gold'], [22, 97, 14, 'rose'], [70, 4, 10, 'gold'],
];

function ProfileShare({ profile }) {
    const { t } = useTranslation();
    const dialogRef = useRef(null);
    const titleId = useId();
    const [qrSrc, setQrSrc] = useState('');
    const [copied, setCopied] = useState(false);
    const [preparing, setPreparing] = useState(false);
    const [downloadError, setDownloadError] = useState(false);

    const { username } = profile;
    const link = `${window.location.origin}/u/${username}`;

    const handleOpen = () => {
        setCopied(false);
        setDownloadError(false);
        dialogRef.current.showModal();

        QRCode.toDataURL(link, {
            width: 480,
            margin: 2,
            errorCorrectionLevel: 'H',
            color: { dark: '#2D241F', light: '#FFFFFF' },
        })
            .then(setQrSrc)
            .catch(() => setQrSrc(''));
    };

    const handleCopy = () => {
        navigator.clipboard
            .writeText(link)
            .then(() => setCopied(true))
            .catch(() => { });
    };

    const handleDownload = () => {
        setPreparing(true);
        setDownloadError(false);

        drawProfileCard({
            link,
            displayName: profile.displayName || username,
            username,
            avatarSrc: getAvatarSrc(profile.avatarUrl),
            stats: [
                { number: profile.booksRead, label: t('profileHeader.cardBooks') },
                { number: profile.reviewsCount, label: t('profileHeader.cardReviews') },
                { number: profile.followerCount, label: t('profileHeader.cardFollowers') },
            ],
            texts: {
                tag: t('profileHeader.cardTag'),
                title: t('profileHeader.cardTitle'),
                scan: t('profileHeader.cardScan'),
                lead: t('profileHeader.cardLead'),
            },
        })
            .then((blob) => {
                const url = URL.createObjectURL(blob);
                const anchor = document.createElement('a');
                anchor.href = url;
                anchor.download = `alibraryofus-${username}.png`;
                anchor.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
            })
            .catch(() => setDownloadError(true))
            .finally(() => setPreparing(false));
    };

    return (
        <>
            <button type="button" className="profile-share" onClick={handleOpen}>
                <Icon name="share" size={14} />
                {t('profileHeader.share')}
            </button>

            <dialog ref={dialogRef} className="card report-dialog profile-qr-dialog" aria-labelledby={titleId}>
                <div className="profile-qr-stars" aria-hidden="true">
                    {DIALOG_STARS.map(([left, top, size, tone], index) => (
                        <svg key={index} className={`profile-qr-star profile-qr-star-${tone}`} viewBox="-8 -8 16 16"
                            style={{
                                left: left + '%',
                                top: top + '%',
                                width: size,
                                height: size,
                                '--twinkle-time': 2.4 + (index % 4) * 0.5 + 's',
                                '--twinkle-delay': (index * 0.37) % 2 + 's',
                            }}>
                            <path d={STAR_PATH} />
                        </svg>
                    ))}
                </div>

                <div className="report-form">
                    <h2 id={titleId} className="display report-title">{t('profileHeader.shareTitle')}</h2>
                    <p className="invite-lead">{t('profileHeader.shareLead')}</p>

                    <div className="profile-qr">
                        {qrSrc && (
                            <div className="profile-qr-code">
                                <img src={qrSrc} alt={t('profileHeader.qrAlt', { username })} width="240" height="240" />
                                <span className="profile-qr-mark"><img src="/logo-mark.png" alt="" /></span>
                            </div>
                        )}
                        <span className="profile-qr-name">@{username}</span>
                    </div>

                    <p className="profile-qr-link">{link}</p>

                    {downloadError && <p className="profile-qr-error" role="alert">{t('profileHeader.cardError')}</p>}

                    <div className="report-actions profile-qr-actions">
                        <button type="button" className="invite-action" onClick={() => dialogRef.current.close()}>
                            {t('common.close')}
                        </button>
                        <button type="button" className="invite-action" onClick={handleDownload} disabled={!qrSrc || preparing}>
                            {preparing ? t('profileHeader.cardPreparing') : t('profileHeader.download')}
                        </button>
                        <button type="button" className="invite-create" onClick={handleCopy}>
                            <span aria-live="polite">{copied ? t('profileHeader.copied') : t('profileHeader.copyLink')}</span>
                        </button>
                    </div>
                </div>
            </dialog>
        </>
    );
}

export default ProfileShare;
