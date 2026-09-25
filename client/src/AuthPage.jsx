import { useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from './Icon';

const MODES = {
    login: {
        background: '/auth-login.jpg',
        title: 'Welcome back',
        subtitle: 'So good to see you again!',
        subtitleIcon: 'favorites',
        button: 'Log in',
        busy: 'Logging in...',
        switchText: "Don't have an account?",
        switchLink: 'Sign up',
        switchTo: '/signup',
    },
    signup: {
        background: '/auth-signup.jpg',
        title: 'Create account',
        subtitle: 'A new chapter awaits',
        subtitleIcon: 'sparkle',
        button: 'Create account',
        busy: 'Creating account...',
        switchText: "Already have an account?",
        switchLink: 'Log in',
        switchTo: '/login',
    },
};

const PASSWORD_RULES = [
    { label: 'At least 8 characters', test: (p) => p.length >= 8 },
    { label: 'A number', test: (p) => /\d/.test(p) },
    { label: 'A letter', test: (p) => /[a-z]/i.test(p) },
];

function AuthPage({ mode, onLogin }) {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const text = MODES[mode];
    const isSignup = mode === 'signup';
    const passwordOk = PASSWORD_RULES.every((rule) => rule.test(password));

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);

        const cleanEmail = email.trim();
        const register = isSignup
            ? postJson('/api/register', { username: username.trim(), email: cleanEmail, password })
            : Promise.resolve();

        register
            .then(() => postJson('/api/login', { email: cleanEmail, password }))
            .then((user) => onLogin(user))
            .catch((er) => {
                setError(er.message);
                setIsSubmitting(false);
            });
    };

    return (
        <div className="access-page" style={{ backgroundImage: `url(${text.background})` }}>
            <div className="access-card">
                <Link to="/" className="access-brand">
                    <img src="/logo.png" alt="Bookish Corner" className="access-logo" />
                </Link>

                <h1 className="display access-title">{text.title}</h1>
                <p className="access-subtitle">
                    {text.subtitle}
                    <Icon name={text.subtitleIcon} size={14} />
                </p>
                <form className="access-form" onSubmit={handleSubmit}>
                    {isSignup && (
                        <label className="access-field">
                            <span className="access-label">Username</span>
                            <span className="access-input-wrap">
                                <Icon name="about" size={18} />
                                <input
                                    className="access-input"
                                    type="text"
                                    placeholder="Choose a username"
                                    autoComplete="username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                />
                            </span>
                        </label>
                    )}

                    <label className="access-field">
                        <span className="access-label">Email</span>
                        <span className="access-input-wrap">
                            <Icon name="mail" size={18} />
                            <input
                                className="access-input"
                                type="email"
                                placeholder="you@example.com"
                                autoComplete="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </span>
                    </label>

                    <label className="access-field">
                        <span className="access-label">Password</span>
                        <span className="access-input-wrap">
                            <Icon name="lock" size={18} />
                            <input
                                className="access-input"
                                type={showPassword ? 'text' : 'password'}
                                placeholder={isSignup ? 'Create a password' : 'Your password'}
                                autoComplete={isSignup ? 'new-password' : 'current-password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <button
                                type="button"
                                className="access-eye"
                                onClick={() => setShowPassword(!showPassword)}
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                                <Icon name={showPassword ? 'eyeOff' : 'eye'} size={18} />
                            </button>
                        </span>
                    </label>

                    {isSignup && (
                        <div className="access-rules">
                            <p className="access-rules-title">Your password must have:</p>
                            <ul className="access-rules-list">
                                {PASSWORD_RULES.map((rule) => {
                                    const passed = rule.test(password);
                                    return (
                                        <li key={rule.label} className={passed ? 'access-rule passed' : 'access-rule'}>
                                            <span className="access-rule-box">
                                                {passed && <Icon name="check" size={12} />}
                                            </span>
                                            {rule.label}
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    )}

                    {error && <p className="access-error">{error}</p>}
                    <button type="submit" className="access-submit" disabled={isSubmitting || (isSignup && !passwordOk)}>
                        {isSubmitting ? text.busy : text.button}
                    </button>
                </form>

                <p className="access-switch">
                    {text.switchText} <Link to={text.switchTo}>{text.switchLink}</Link>
                </p>
            </div>
        </div>
    );
}

const postJson = (url, body) =>
    fetch(`http://localhost:3000${url}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
    }).then((res) =>
        res.json().then((data) => {
            if (!res.ok) throw new Error(data.error);
            return data;
        })
    );

export default AuthPage;