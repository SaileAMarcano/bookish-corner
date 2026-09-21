import { useState } from 'react';
import { Link } from 'react-router-dom';

function AuthForm({ onLogin }) {
    const [isRegistering, setIsRegistering] = useState(false);
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');

        const endpoint = isRegistering ? '/api/register' : '/api/login';
        const body = isRegistering
            ? { username, email, password }
            : { email, password };

        fetch(`http://localhost:3000${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(body),
        })
            .then((res) => {
                if (!res.ok) {
                    return res.json().then((data) => {
                        throw new Error(data.error);
                    });
                }
                return res.json();
            })
            .then((user) => {
                if (isRegistering) {
                    setIsRegistering(false);
                } else {
                    onLogin(user);
                }
            })
            .catch((err) => setError(err.message));
    };

    const toggleMode = () => {
        setIsRegistering(!isRegistering);
        setError('');
    };

    return (
        <div className="auth-page">
            <header className="site-header">
                <Link to="/" className="display logo">Bookish Corner</Link>
            </header>

            <main className="auth-main">
                <form onSubmit={handleSubmit} className="card auth-card">
                    <div className="auth-heading">
                        <h1 className="display auth-title">
                            {isRegistering ? 'Create your account' : 'Welcome back'}
                        </h1>
                        <p className="auth-subtitle">
                            {isRegistering
                                ? 'Start your shelf in less than a minute.'
                                : 'Log in to get back to your books.'}
                        </p>
                    </div>

                    {isRegistering && (
                        <div className="profile-field">
                            <label className="profile-label">Username</label>
                            <input
                                className="profile-input"
                                type="text"
                                placeholder="suukibo"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                            />
                        </div>
                    )}

                    <div className="profile-field">
                        <label className="profile-label">Email</label>
                        <input
                            className="profile-input"
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div className="profile-field">
                        <label className="profile-label">Password</label>
                        <input
                            className="profile-input"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    {error && <p className="auth-error">{error}</p>}

                    <button type="submit" className="pill auth-submit">
                        {isRegistering ? 'Create account' : 'Log in'}
                    </button>

                    <p className="auth-switch">
                        {isRegistering ? 'Already have an account?' : "Don't have an account?"}{' '}
                        <button type="button" className="auth-switch-button" onClick={toggleMode}>
                            {isRegistering ? 'Log in' : 'Register'}
                        </button>
                    </p>
                </form>
            </main>
        </div>
    );
}

export default AuthForm;