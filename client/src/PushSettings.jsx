import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiFetch } from './api';
import { currentSubscription, disablePush, enablePush, pushSupport } from './push';
import './PushSettings.css';

function PushSettings() {
    const { t } = useTranslation();
    const [support] = useState(pushSupport);
    const [config, setConfig] = useState(null);
    const [on, setOn] = useState(false);
    const [permission, setPermission] = useState(() => ('Notification' in window ? Notification.permission : 'default'));
    const [busy, setBusy] = useState(false);
    const [status, setStatus] = useState('');

    useEffect(() => {
        let active = true;
        currentSubscription().catch(() => null).then((subscription) => {
            const endpoint = subscription ? '?endpoint=' + encodeURIComponent(subscription.endpoint) : '';
            return apiFetch('/api/push' + endpoint).then((data) => {
                if (!active) return;
                setConfig(data);
                setOn(Boolean(subscription) && data.thisDevice);
            });
        }).catch((error) => active && setStatus(error.message));
        return () => { active = false; };
    }, []);

    const toggleDevice = () => {
        setBusy(true);
        setStatus('');
        const action = on
            ? disablePush().then(() => { setOn(false); setStatus(t('settings.notifications.turnedOff')); })
            : enablePush(config.publicKey).then((result) => {
                setPermission(result);
                if (result === 'granted') {
                    setOn(true);
                    setStatus(t('settings.notifications.turnedOn'));
                }
            });
        action.catch((error) => setStatus(error.status ? error.message : t('settings.notifications.failed'))).finally(() => setBusy(false));
    };

    const sendTest = () => {
        setBusy(true);
        setStatus('');
        apiFetch('/api/push/test', { method: 'POST' })
            .then(() => setStatus(t('settings.notifications.testSent')))
            .catch((error) => setStatus(error.message))
            .finally(() => setBusy(false));
    };

    const toggleType = (group) => {
        const types = config.types.includes(group) ? config.types.filter((type) => type !== group) : [...config.types, group];
        setConfig({ ...config, types });
        apiFetch('/api/push/types', { method: 'PUT', body: { types } })
            .then((data) => setConfig((current) => ({ ...current, types: data.types })))
            .catch((error) => {
                setConfig((current) => ({ ...current, types: config.types }));
                setStatus(error.message);
            });
    };

    let hint = on ? t('settings.notifications.deviceOnHint') : t('settings.notifications.deviceHint');
    let canToggle = Boolean(config?.enabled);
    if (!support.supported && !support.needsInstall) {
        hint = t('settings.notifications.unsupported');
        canToggle = false;
    } else if (support.needsInstall) {
        hint = t('settings.notifications.iosHint');
        canToggle = false;
    } else if (config && !config.enabled) {
        hint = t('settings.notifications.unavailable');
    } else if (permission === 'denied' && !on) {
        hint = t('settings.notifications.blocked');
        canToggle = false;
    }

    return (
        <>
            <div className="settings-row">
                <div className="settings-row-text">
                    <span className="settings-row-label">{t('settings.notifications.device')}</span>
                    <span className="settings-row-hint">{hint}</span>
                </div>
                {canToggle && (
                    <div className="settings-row-control">
                        <button
                            type="button"
                            className="settings-switch"
                            role="switch"
                            aria-checked={on}
                            aria-label={t('settings.notifications.device')}
                            disabled={busy}
                            onClick={toggleDevice}
                        >
                            <span className="settings-switch-thumb"></span>
                        </button>
                    </div>
                )}
            </div>

            {support.needsInstall && (
                <ol className="push-install-steps">
                    <li>{t('settings.notifications.iosStep1')}</li>
                    <li>{t('settings.notifications.iosStep2')}</li>
                    <li>{t('settings.notifications.iosStep3')}</li>
                </ol>
            )}

            {on && (
                <div className="settings-row">
                    <div className="settings-row-text">
                        <span className="settings-row-label">{t('settings.notifications.test')}</span>
                        <span className="settings-row-hint">{t('settings.notifications.testHint')}</span>
                    </div>
                    <div className="settings-row-control">
                        <button type="button" className="ghost-button" disabled={busy} onClick={sendTest}>
                            {t('settings.notifications.testButton')}
                        </button>
                    </div>
                </div>
            )}

            {config && (
                <div className="settings-row settings-block">
                    <div className="settings-row-text">
                        <span className="settings-row-label">{t('settings.notifications.types')}</span>
                        <span className="settings-row-hint">{t('settings.notifications.typesHint')}</span>
                    </div>
                    <ul className="push-types">
                        {config.groups.map((group) => (
                            <li key={group}>
                                <span className="settings-row-text">
                                    <span className="push-type-label">{t(`settings.notifications.groups.${group}.name`)}</span>
                                    <span className="settings-row-hint">{t(`settings.notifications.groups.${group}.text`)}</span>
                                </span>
                                <button
                                    type="button"
                                    className="settings-switch"
                                    role="switch"
                                    aria-checked={config.types.includes(group)}
                                    aria-label={t(`settings.notifications.groups.${group}.name`)}
                                    onClick={() => toggleType(group)}
                                >
                                    <span className="settings-switch-thumb"></span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {status && <p className="push-status" role="status">{status}</p>}
        </>
    );
}

export default PushSettings;
