import { Component } from 'react';
import i18n from './i18n';
import EmptyState from './EmptyState';

class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error, info) {
        console.error(error, info.componentStack);
    }

    render() {
        if (!this.state.hasError) return this.props.children;

        return (
            <main className="error-boundary">
                <div className="card error-boundary-card">
                    <EmptyState title={i18n.t('errors.crashTitle')} description={i18n.t('errors.crashText')} kind="writing">
                        <div className="error-boundary-actions">
                            <button className="brand-primary" type="button" onClick={() => window.location.reload()}>{i18n.t('errors.reload')}</button>
                            <a href="/">{i18n.t('errors.goHome')}</a>
                        </div>
                    </EmptyState>
                </div>
            </main>
        );
    }
}

export default ErrorBoundary;
