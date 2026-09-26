import { Link } from 'react-router-dom';
import PublicHeader from './PublicHeader';
import PublicFooter from './PublicFooter';
import Icon from './Icon';

const ABOUT_VALUES = [
    {
        icon: 'library',
        title: 'For every kind of reader',
        text: 'Fantasy, romance, classics or manga: whatever you read, and however fast, there is a shelf here for you.',
    },
    {
        icon: 'following',
        title: 'A kind community',
        text: 'Reviews and comments are for sharing what a story meant to you, not for arguing about it.',
    },
    {
        icon: 'sparkle',
        title: 'A more meaningful reading journey',
        text: 'Keep track of your pages, your thoughts and your yearly goal, and look back on everything you have read.',
    },
];

function AboutPage() {
    return (
        <div className="public-page">
            <PublicHeader />

            <main>
                <section className="public-hero public-hero-about">
                    <div className="public-hero-text">
                        <p className="public-eyebrow">About Bookish Corner</p>

                        <h1 className="display public-hero-title">
                            More than a reading tracker
                            <span className="public-title-heart">
                                <Icon name="favorites" size={36} />
                            </span>
                        </h1>

                        <p className="public-hero-lead">
                            Bookish Corner started with a simple wish: a place to keep track of books
                            that feels as warm as the stories themselves. Not a spreadsheet, not a noisy feed.
                        </p>
                        <p className="public-hero-lead">
                            Follow your progress page by page, write down what a book made you feel,
                            and share it with readers who get it.
                        </p>

                        <div className="public-hero-actions">
                            <Link to="/signup" className="public-signup public-cta">
                                Start reading
                                <Icon name="arrowRight" size={18} />
                            </Link>
                        </div>
                    </div>
                </section>

                <section className="about-columns">
                    <div className="about-story">
                        <p className="public-eyebrow">Our story</p>
                        <h2 className="display about-heading">A cozy idea, for a brighter you.</h2>
                        <p className="about-text">
                            I have always kept my reading life in scattered places: notes on my phone,
                            photos of pages, half-finished lists. I wanted one calm corner where all of it
                            could live together.
                        </p>
                        <p className="about-text">
                            So I built it. Bookish Corner is made by a reader, for readers: small on purpose,
                            kind by design, and shaped by the people who use it.
                        </p>
                    </div>

                    <ul className="about-values">
                        {ABOUT_VALUES.map((value) => (
                            <li key={value.title} className="about-value">
                                <span className="about-value-icon">
                                    <Icon name={value.icon} size={22} />
                                </span>
                                <div>
                                    <h3 className="display about-value-title">{value.title}</h3>
                                    <p className="about-text">{value.text}</p>
                                </div>
                            </li>
                        ))}
                    </ul>

                    <figure className="about-quote">
                        <Icon name="favorites" size={22} />
                        <blockquote className="display about-quote-text">
                            A little corner, for a lot of stories.
                        </blockquote>
                        <img src="/logo-mark.png" alt="" className="about-quote-image" />
                    </figure>
                </section>
            </main>
            <PublicFooter />
        </div>
    );
}

export default AboutPage;