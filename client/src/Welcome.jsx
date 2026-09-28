import { useState } from 'react';
import Icon from './Icon';
import { apiFetch } from './api';

const READER_TYPES = [
    {
        value: 'first-time',
        icon: 'sparkle',
        title: 'First-time reader',
        text: "I'm just starting my reading journey.",
        goal: 3,
    },
    {
        value: 'casual',
        icon: 'reading',
        title: 'Casual reader',
        text: 'I read when I find the time.',
        goal: 12,
    },
    {
        value: 'avid',
        icon: 'library',
        title: 'Avid reader',
        text: 'I always have a book (or three) going.',
        goal: 30,
    },
];

function Welcome({ currentUser, onDone }) {
    const [choice, setChoice] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    const selected = READER_TYPES.find((type) => type.value === choice);

    const finish = (useGoal) => {
        setIsSaving(true);
        setError('');

        const body = { readerType: choice };
        if (useGoal) body.readingGoal = selected.goal;

        apiFetch('/api/profile', { method: 'PATCH', body })
            .then(() => onDone())
            .catch((error) => {
                setError(error.message);
                setIsSaving(false);
            });
    };

    return (
        <div className="access-page" style={{ backgroundImage: 'url(/auth-welcome.jpg)' }}>
            <div className="access-card welcome-card">
                <img src="/logo.png" alt="Bookish Corner" className="access-logo welcome-logo" />

                <p className="welcome-hello">Welcome, {currentUser.displayName}!</p>
                <h1 className="display access-title">How would you describe yourself as a reader?</h1>
                <p className="access-subtitle">There's no wrong answer.</p>

                <div className="welcome-options">
                    {READER_TYPES.map((type) => (
                        <button key={type.value}
                            type="button"
                            className={type.value === choice ? 'welcome-option selected' : 'welcome-option'}
                            onClick={() => setChoice(type.value)}
                            aria-pressed={type.value === choice}
                            disabled={isSaving} >

                            <span className="welcome-option-icon">
                                <Icon name={type.icon} size={22} />
                            </span>
                            <span className="welcome-option-text">
                                <strong>{type.title}</strong>
                                {type.text}
                            </span>
                        </button>
                    ))}
                </div>

                {selected && (
                    <div className="welcome-goal">
                        <p className="welcome-goal-text">
                            Suggested goal: <strong>{selected.goal} books</strong> this year
                        </p>
                        <button type="button" className="access-submit"
                            onClick={() => finish(true)}
                            disabled={isSaving} >
                            {isSaving ? 'Saving...' : 'Set this goal and start'}
                        </button>
                        <button type="button" className="welcome-skip"
                            onClick={() => finish(false)}
                            disabled={isSaving} >
                            Skip the goal for now
                        </button>
                    </div>
                )}

                {error && <p className="access-error">{error}</p>}
            </div>
        </div>
    );
}

export default Welcome;