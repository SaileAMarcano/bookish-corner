import { useEffect, useState } from 'react';

function LoadingState({ label, compact = false }) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setVisible(true), 250);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className={`loading-state ${compact ? 'loading-state-compact' : ''}`} role="status" aria-live="polite">
            {visible && (
                <>
                    <span className="loading-books" aria-hidden="true">
                        <span />
                        <span />
                        <span />
                    </span>
                    <span className="loading-label">{label}</span>
                </>
            )}
        </div>
    );
}

export default LoadingState;
