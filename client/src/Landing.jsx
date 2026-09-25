import { Link } from 'react-router-dom'

function Landing() {
    return (

        <div className="landing">
            <header className="site-header">
                <div className="display logo">Bookish Corner</div>
                <Link to="/login" className="pill ghost-button">Log in</Link>
            </header>

            <main className="landing-main">
                <section className="landing-hero">
                    <div className="display hero-eyebrow">A cozy corner for readers</div>

                    <h1 className="display landing-title">
                        Track your books.<br />
                        Write your thoughts. <br />
                        Find your people.
                    </h1>

                    <p className="landing-lead">
                        Bookish Corner is a small, warm space for readers. Search any book, add it to
                        your shelf, keep track of how far you've gotten, and write down what you really
                        thought — then see what other readers had to say about the same story.
                    </p>

                    <div className="landing-actions">
                        <Link to="/signup" className="pill landing-cta">Start reading</Link>
                        <a href="#features" className="pill ghost-button">Learn more</a>
                    </div>
                </section>

                <section className="landing-features" id="features">
                    <div className="card feature-card">
                        <div className="feature-icon">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z"></path>
                            </svg>
                        </div>
                        <h2 className="display feature-title">Track what you're reading</h2>
                        <p className="feature-text">
                            Add any book from a catalogue of millions. Mark it as want to read, reading
                            or finished, and keep your progress up to date as you go.
                        </p>
                    </div>

                    <div className="card feature-card">
                        <div className="feature-icon">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 20h9"></path>
                                <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"></path>
                            </svg>
                        </div>

                        <h2 className="display feature-title">Write your own reviews</h2>
                        <p className="feature-text">
                            Every book on your shelf is yours to write about. Covers, authors and
                            summaries come filled in automatically, so all you bring are the words.
                        </p>
                    </div>


                    <div className="card feature-card">
                        <div className="feature-icon">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-3.9-.9L3 20l1.1-4.1A8.4 8.4 0 0 1 3 11.5 8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5z"></path>
                            </svg>
                        </div>
                        <h2 className="display feature-title">Read what others thought</h2>
                        <p className="feature-text">
                            Like and comment on other readers' reviews, and find out what the same book
                            meant to someone else.
                        </p>
                    </div>
                </section>
            </main>

            <footer className="landing-footer">
                Built by Suukibo
            </footer>
        </div>
    )
}

export default Landing