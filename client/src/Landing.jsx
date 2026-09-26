import { Link } from 'react-router-dom';
import PublicHeader from './PublicHeader';
import PublicFooter from './PublicFooter';
import Icon from './Icon';

const HERO_LINES = ['Track your books', 'Write your thoughts', 'Find your people'];

function Landing() {
    return (
        <div className="landing">
            <PublicHeader />

            <main className="public-hero">
                <div className="public-hero-text">
                    <p className="public-eyebrow">A cozy corner for readers</p>

                    <h1 className="display public-hero-title">
                        {HERO_LINES.map((line) => (
                            <span key={line} className="public-hero-line">
                                {line}
                                <span className="public-dot">.</span>
                            </span>
                        ))}
                    </h1>

                    <p className="public-hero-lead">
                        Bookish Corner is a small, warm space for readers. Search any book, add it to
                        your shelf, keep track of how far you've gotten, and write down what you really
                        thought — then see what other readers had to say about the same story.
                    </p>

                    <div className="public-hero-actions">
                        <Link to="/signup" className="public-signup public-cta">
                            Start reading
                            <Icon name="arrowRight" size={18} />
                        </Link>
                        <Link to="/features" className="public-login public-cta">
                            Learn more
                        </Link>
                    </div>
                </div>
            </main>

            <PublicFooter />
        </div>
    );
}

export default Landing;