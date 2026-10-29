import { useState, useRef, useId } from 'react';
import { useTranslation } from 'react-i18next';
import Icon from './Icon';
import { apiFetch } from './api';

const REASONS = ['spoiler', 'offensive', 'harassment', 'spam', 'other'];
const NO_SPOILER = ['profile', 'tag'];

function ReportButton({ targetType, targetId }) {
    const { t } = useTranslation();
    const titleId = useId();
    const dialogRef = useRef(null);
    const [reason, setReason] = useState('');
    const [details, setDetails] = useState('');
    const [status, setStatus] = useState('idle');
    const [error, setError] = useState('');

    const reasons = NO_SPOILER.includes(targetType) ? REASONS.filter((option) => option !== 'spoiler') : REASONS;

    const handleOpen = () => {
        setReason('');
        setDetails('');
        setStatus('idle');
        setError('');
        dialogRef.current.showModal();
    };

    const handleClose = () => dialogRef.current.close();

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');
        setStatus('sending');

        apiFetch('/api/reports', { method: 'POST', body: { targetType, targetId, reason, details } })
            .then(() => setStatus('sent'))
            .catch((err) => {
                setError(err.message);
                setStatus('idle');
            });
    };

    return (
        <>
            <button type="button" className="report-button" onClick={handleOpen} aria-label={t('report.open')} title={t('report.open')}>
                <Icon name="flag" size={15} />
            </button>

            <dialog ref={dialogRef} className="card report-dialog" aria-labelledby={titleId}>
                {status === 'sent' ? (
                    <div className="report-form">
                        <h2 id={titleId} className="display report-title">{t('report.sentTitle')}</h2>
                        <p className="invite-lead" role="status">{t('report.sentText')}</p>
                        <div className="report-actions">
                            <button type="button" className="invite-create" onClick={handleClose}>{t('report.close')}</button>
                        </div>
                    </div>
                ) : (
                    <form className="report-form" onSubmit={handleSubmit}>
                        <h2 id={titleId} className="display report-title">{t(`report.title.${targetType}`)}</h2>
                        <p className="invite-lead">{t('report.lead')}</p>

                        <fieldset className="report-reasons">
                            <legend className="section-label">{t('report.reasonLabel')}</legend>
                            {reasons.map((option) => (
                                <label key={option} className="report-reason">
                                    <input
                                        type="radio"
                                        name="reason"
                                        value={option}
                                        checked={reason === option}
                                        onChange={() => setReason(option)}
                                    />
                                    {t(`report.reasons.${option}`)}
                                </label>
                            ))}
                        </fieldset>

                        <textarea
                            value={details}
                            onChange={(e) => setDetails(e.target.value)}
                            placeholder={t('report.detailsPlaceholder')}
                            aria-label={t('report.detailsPlaceholder')}
                            maxLength={500}
                            rows={3}
                        />

                        {error && <p className="access-error">{error}</p>}

                        <div className="report-actions">
                            <button type="button" className="invite-action" onClick={handleClose}>{t('common.cancel')}</button>
                            <button type="submit" className="invite-create" disabled={!reason || status === 'sending'}>
                                {t('report.send')}
                            </button>
                        </div>
                    </form>
                )}
            </dialog>
        </>
    );
}

export default ReportButton;