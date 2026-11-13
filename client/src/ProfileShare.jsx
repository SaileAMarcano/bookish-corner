import { useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import QRCode from 'qrcode';
import Icon from './Icon';

function ProfileShare({ username }) {
    const { t } = useTranslation();
    const dialogRef = useRef(null);
    const titleId = useId();
    const [qrSrc, setQrSrc] = useState('');
    const [copied, setCopied] = useState(false);

    const link = `${window.location.origin}/u/${username}`;

    const handleOpen = () => {
        setCopied(false);
        dialogRef.current.showModal();

        QRCode.toDataURL(link, {
            width: 480,
            margin: 2,
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
        const anchor = document.createElement('a');
        anchor.href = qrSrc;
        anchor.download = `alibraryofus-${username}.png`;
        anchor.click();
    };

    return (
        <>
            <button type="button" className="profile-share" onClick={handleOpen}>
                <Icon name="share" size={14} />
                {t('profileHeader.share')}
            </button>

            <dialog ref={dialogRef} className="card report-dialog profile-qr-dialog" aria-labelledby={titleId}>
                <div className="report-form">
                    <h2 id={titleId} className="display report-title">{t('profileHeader.shareTitle')}</h2>
                    <p className="invite-lead">{t('profileHeader.shareLead')}</p>

                    <div className="profile-qr">
                        {qrSrc && <img src={qrSrc} alt={t('profileHeader.qrAlt', { username })} width="240" height="240" />}
                        <span className="profile-qr-name">@{username}</span>
                    </div>

                    <p className="profile-qr-link">{link}</p>

                    <div className="report-actions profile-qr-actions">
                        <button type="button" className="invite-action" onClick={() => dialogRef.current.close()}>
                            {t('common.close')}
                        </button>
                        <button type="button" className="invite-action" onClick={handleDownload} disabled={!qrSrc}>
                            {t('profileHeader.download')}
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