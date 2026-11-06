import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import PublicHeader from './PublicHeader';
import PublicFooter from './PublicFooter';
import BetaShelf from './BetaShelf';
import Icon from './Icon';
import { apiFetch } from './api';
import { GENRES } from './utils';
import { WEB3FORMS_KEY, BETA_TRACKING, BETA_FOUND_VIA } from './betaConfig';

const FACTS = [
    { key: 'dates', icon: 'calendar' },
    { key: 'people', icon: 'following' },
    { key: 'voice', icon: 'feather' },
    { key: 'languages', icon: 'sparkle' },
];

const STAR_PATH = 'M0-8c.6 5 3 7.4 8 8-5 .6-7.4 3-8 8-.6-5-3-7.4-8-8 5-.6 7.4-3 8-8Z';

const FORM_STARS = [
    [-6, 4, 18, 'gold'], [-3, 14, 10, 'rose'], [-8, 26, 14, 'lavender'], [-4, 40, 20, 'gold'],
    [-7, 53, 11, 'rose'], [-3, 66, 16, 'gold'], [-8, 78, 12, 'lavender'], [-4, 91, 18, 'gold'],
    [104, 6, 14, 'lavender'], [101, 18, 20, 'gold'], [106, 31, 11, 'rose'], [102, 45, 16, 'gold'],
    [107, 58, 12, 'lavender'], [103, 70, 19, 'gold'], [106, 83, 10, 'rose'], [102, 95, 15, 'gold'],
    [12, -3, 12, 'rose'], [30, -4, 16, 'gold'], [50, -3, 11, 'lavender'], [70, -4, 15, 'gold'], [88, -3, 12, 'rose'],
    [18, 101, 15, 'gold'], [40, 102, 11, 'lavender'], [62, 101, 16, 'gold'], [82, 102, 11, 'rose'],
];

const EMPTY_FORM = {
    name: '',
    email: '',
    age: '',
    social: '',
    appLanguage: '',
    genres: [],
    tracking: [],
    foundVia: '',
    phrase: '',
    isAdult: false,
    willGiveFeedback: false,
    acceptsEmail: false,
    website: '',
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SEND_TIMEOUT = 60000;
const SLOW_AFTER = 6000;

function toggle(list, value) {
    return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

function problemOf(form) {
    const age = Number(form.age);
    if (!form.name.trim()) return 'name';
    if (!EMAIL_PATTERN.test(form.email.trim())) return 'email';
    if (!form.age || !Number.isInteger(age)) return 'age';
    if (age < 18) return 'adult';
    if (!form.appLanguage) return 'language';
    if (form.genres.length === 0) return 'genres';
    if (form.phrase.trim().length < 5) return 'phrase';
    if (!form.isAdult || !form.willGiveFeedback || !form.acceptsEmail) return 'checks';
    return null;
}

function notifyByEmail(form, t) {
    if (!WEB3FORMS_KEY || WEB3FORMS_KEY.startsWith('PEGA_AQUI')) return;

    const list = (values, prefix) => values.map((value) => t(`${prefix}.${value}`, { lng: 'es' })).join(' · ') || '—';
    const name = form.name.trim();
    const social = form.social.trim();
    const handle = social && !social.startsWith('@') ? `@${social}` : social;

    fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
            access_key: WEB3FORMS_KEY,
            subject: `✨ Nueva postulación a la beta: ${name} (${form.age} años)`,
            from_name: 'A Library of Us · Beta',
            replyto: form.email.trim(),
            '🪶 Su frase': `“${form.phrase.trim()}”`,
            '📖 Nombre': name,
            '✉️ Correo': form.email.trim(),
            '🎂 Edad': `${form.age} años`,
            '📱 Instagram o TikTok': handle || 'No lo dejó',
            '🌐 Idioma de la app': form.appLanguage === 'es' ? 'Español' : 'English',
            '📚 Géneros que más lee': list(form.genres, 'genres'),
            '🗂️ Dónde lleva sus lecturas': list(form.tracking, 'beta.tracking'),
            '💌 Cómo nos conoció': form.foundVia ? t(`beta.foundVia.${form.foundVia}`, { lng: 'es' }) : '—',
            '⭐ Para invitarla': `${window.location.origin}/admin/applications`,
        }),
    }).catch(() => { });
}

function Chip({ selected, onClick, children }) {
    return (
        <button type="button" className={`apply-chip ${selected ? 'selected' : ''}`} aria-pressed={selected} onClick={onClick}>
            {selected && <Icon name="check" size={12} />}
            {children}
        </button>
    );
}

function BetaPage() {
    const { t } = useTranslation();
    const [form, setForm] = useState(EMPTY_FORM);
    const [error, setError] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isSlow, setIsSlow] = useState(false);
    const [sent, setSent] = useState(null);

    const update = (field, value) => {
        setForm((current) => ({ ...current, [field]: value }));
        setError('');
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        const problem = problemOf(form);
        if (problem) {
            setError(t(`beta.errors.${problem}`));
            return;
        }

        setIsSending(true);
        const slowTimer = setTimeout(() => setIsSlow(true), SLOW_AFTER);

        apiFetch('/api/beta-applications', {
            method: 'POST',
            body: { ...form, age: Number(form.age) },
            timeout: SEND_TIMEOUT,
        })
            .then(() => {
                notifyByEmail(form, t);
                setSent({ name: form.name.trim(), email: form.email.trim() });
                window.scrollTo({ top: document.getElementById('apply-form').offsetTop - 24, behavior: 'smooth' });
            })
            .catch((err) => setError(err.message))
            .finally(() => {
                clearTimeout(slowTimer);
                setIsSlow(false);
                setIsSending(false);
            });
    };

    const required = <span className="apply-required" aria-hidden="true">*</span>;

    return (
        <div className="public-page apply-page">
            <PublicHeader />

            <main>
                <section className="apply-hero">
                    <div className="apply-hero-text">
                        <p className="public-eyebrow">{t('beta.eyebrow')}</p>
                        <h1 className="display apply-title">
                            {t('beta.title')} <em>{t('beta.titleAccent')}</em>
                        </h1>
                        <p className="apply-lead">{t('beta.lead')}</p>
                        <a href="#apply-form" className="public-signup public-cta apply-jump">
                            {t('beta.jump')}
                            <Icon name="arrowRight" size={18} />
                        </a>
                    </div>
                    <BetaShelf filled={Boolean(sent)} />
                </section>

                <ul className="apply-facts">
                    {FACTS.map((fact) => (
                        <li key={fact.key} className="apply-fact">
                            <Icon name={fact.icon} size={20} />
                            <strong className="display">{t(`beta.facts.${fact.key}.title`)}</strong>
                            <span>{t(`beta.facts.${fact.key}.text`)}</span>
                        </li>
                    ))}
                </ul>

                <section className="apply-section" id="apply-form">
                    <div className="apply-card-wrap">
                        <div className="apply-card-stars" aria-hidden="true">
                            {FORM_STARS.map(([left, top, size, tone], index) => (
                                <svg
                                    key={index}
                                    className={`apply-card-star apply-tone-${tone}`}
                                    viewBox="-8 -8 16 16"
                                    width={size}
                                    height={size}
                                    style={{ left: `${left}%`, top: `${top}%`, '--twinkle-time': `${1.6 + (index % 5) * 0.5}s`, '--twinkle-delay': `${((index * 0.37) % 2.4).toFixed(2)}s` }}
                                >
                                    <path d={STAR_PATH} />
                                </svg>
                            ))}
                        </div>
                        <div className="apply-card">
                            {sent ? (
                                <div className="apply-thanks" role="status">
                                    <BetaShelf filled />
                                    <h2 className="display">{t('beta.thanksTitle', { name: sent.name })}</h2>
                                    <p>{t('beta.thanksText', { email: sent.email })}</p>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} noValidate>
                                    <h2 className="display apply-card-title">{t('beta.formTitle')}</h2>
                                    <p className="apply-card-lead">{t('beta.formLead')} {required}</p>

                                    <input
                                        className="apply-honeypot"
                                        type="text"
                                        name="website"
                                        tabIndex={-1}
                                        autoComplete="off"
                                        value={form.website}
                                        onChange={(e) => update('website', e.target.value)}
                                        aria-hidden="true"
                                    />

                                    <fieldset className="apply-fieldset">
                                        <legend className="display"><span className="apply-step">1</span>{t('beta.sections.you')}</legend>
                                        <div className="apply-grid">
                                            <label className="apply-field">
                                                <span>{t('beta.fields.name')} {required}</span>
                                                <input type="text" value={form.name} maxLength={80} autoComplete="name" onChange={(e) => update('name', e.target.value)} />
                                            </label>
                                            <label className="apply-field">
                                                <span>{t('beta.fields.email')} {required}</span>
                                                <input type="email" value={form.email} maxLength={160} autoComplete="email" placeholder={t('beta.fields.emailPlaceholder')} onChange={(e) => update('email', e.target.value)} />
                                            </label>
                                            <label className="apply-field">
                                                <span>{t('beta.fields.age')} {required}</span>
                                                <input type="number" inputMode="numeric" min={1} max={120} value={form.age} onChange={(e) => update('age', e.target.value)} />
                                            </label>
                                            <label className="apply-field">
                                                <span>{t('beta.fields.social')} <small>{t('beta.optional')}</small></span>
                                                <input type="text" value={form.social} maxLength={60} placeholder="@" onChange={(e) => update('social', e.target.value)} />
                                            </label>
                                        </div>

                                        <p className="apply-question">{t('beta.fields.appLanguage')} {required}</p>
                                        <div className="apply-segmented" role="group" aria-label={t('beta.fields.appLanguage')}>
                                            {['en', 'es'].map((language) => (
                                                <button
                                                    key={language}
                                                    type="button"
                                                    className={form.appLanguage === language ? 'selected' : ''}
                                                    aria-pressed={form.appLanguage === language}
                                                    onClick={() => update('appLanguage', language)}
                                                >
                                                    {t(`language.${language}`)}
                                                </button>
                                            ))}
                                        </div>
                                    </fieldset>

                                    <fieldset className="apply-fieldset">
                                        <legend className="display"><span className="apply-step">2</span>{t('beta.sections.reading')}</legend>

                                        <p className="apply-question">{t('beta.fields.genres')} {required}</p>
                                        <div className="apply-chips">
                                            {GENRES.map((genre) => (
                                                <Chip key={genre} selected={form.genres.includes(genre)} onClick={() => update('genres', toggle(form.genres, genre))}>
                                                    {t(`genres.${genre}`)}
                                                </Chip>
                                            ))}
                                        </div>

                                        <p className="apply-question">{t('beta.fields.tracking')}</p>
                                        <div className="apply-chips">
                                            {BETA_TRACKING.map((option) => (
                                                <Chip key={option} selected={form.tracking.includes(option)} onClick={() => update('tracking', toggle(form.tracking, option))}>
                                                    {t(`beta.tracking.${option}`)}
                                                </Chip>
                                            ))}
                                        </div>

                                        <p className="apply-question">{t('beta.fields.foundVia')}</p>
                                        <div className="apply-chips">
                                            {BETA_FOUND_VIA.map((option) => (
                                                <Chip key={option} selected={form.foundVia === option} onClick={() => update('foundVia', form.foundVia === option ? '' : option)}>
                                                    {t(`beta.foundVia.${option}`)}
                                                </Chip>
                                            ))}
                                        </div>
                                    </fieldset>

                                    <fieldset className="apply-fieldset">
                                        <legend className="display"><span className="apply-step">3</span>{t('beta.sections.tell')}</legend>

                                        <label className="apply-field">
                                            <span>{t('beta.fields.phrase')} {required}</span>
                                            <input type="text" value={form.phrase} maxLength={140} placeholder={t('beta.fields.phrasePlaceholder')} onChange={(e) => update('phrase', e.target.value)} />
                                        </label>
                                        <p className="apply-counter">{form.phrase.length} / 140</p>

                                        {['isAdult', 'willGiveFeedback', 'acceptsEmail'].map((field) => (
                                            <label key={field} className="apply-check">
                                                <input type="checkbox" checked={form[field]} onChange={(e) => update(field, e.target.checked)} />
                                                <span>{t(`beta.checks.${field}`)} {required}</span>
                                            </label>
                                        ))}
                                    </fieldset>

                                    <div className="apply-send">
                                        <button type="submit" className="public-signup public-cta" disabled={isSending}>
                                            {isSending ? t('beta.sending') : t('beta.send')}
                                            <Icon name="arrowRight" size={18} />
                                        </button>
                                    </div>
                                    {isSlow && <p className="apply-slow" role="status">{t('beta.slow')}</p>}
                                    <p className="apply-error" role="alert">{error}</p>
                                    <p className="apply-note">{t('beta.note')}</p>
                                </form>
                            )}
                        </div>
                    </div>
                </section>
            </main>

            <PublicFooter />
        </div>
    );
}

export default BetaPage;
