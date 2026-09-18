import { useState } from 'react';

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

    return (
        <div className="page">
            <form onSubmit={handleSubmit} className="card" style={{ padding: '32px', maxWidth: '360px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <h2 className="display">{isRegistering ? 'Create account' : 'Log in'}</h2>

                {isRegistering && (
                    <input
                        type="text"
                        placeholder="Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                    />
                )}
                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />

                {error && <p style={{ color: 'red', fontSize: '13px' }}>{error}</p>}

                <button type="submit" className="comment-button">
                    {isRegistering ? 'Register' : 'Log in'}
                </button>

                <button type="button" onClick={() => setIsRegistering(!isRegistering)} className="like-button">
                    {isRegistering ? 'Already have an account? Log in' : "Don't have an account? Register"}
                </button>
            </form>
        </div>
    );
}

export default AuthForm;