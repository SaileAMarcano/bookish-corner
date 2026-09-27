function Notice({ message, onRetry }) {
    return (
        <div className="notice" role="alert">
            <p className="notice-text">{message}</p>
            {onRetry && (
                <button type="button" className="notice-retry" onClick={onRetry}>
                    Try again
                </button>
            )}
        </div>
    );
}
export default Notice;
