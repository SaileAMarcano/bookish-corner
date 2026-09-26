import PublicHeader from './PublicHeader';
import PublicBand from './PublicBand';
import PublicFooter from './PublicFooter';
import Icon from './Icon';

const FEATURES = [
    {
        image: '/feature-track.jpg',
        title: 'Track your reading',
        text: 'Log your page and chapter, and watch your progress bar fill up as you go.',
    },
    {
        image: '/feature-reviews.jpg',
        title: 'Write and share reviews',
        text: 'Say what a book made you feel, and read what others wrote about the same story.',
    },
    {
        image: '/feature-comments.jpg',
        title: 'Talk about the stories',
        text: 'Like and comment on reviews, and keep the conversation kind and bookish.',
    },
    {
        image: '/feature-library.jpg',
        title: 'Build your personal library',
        text: 'Every book you add lives on your shelf, with its status, your review and your favorites.',
    },
    {
        image: '/feature-discover.jpg',
        title: 'Discover new books',
        text: 'Search millions of titles and open any book to see every review it has.',
    },
    {
        image: '/feature-people.jpg',
        title: 'Find your people',
        text: "Visit other readers' profiles and follow the ones whose taste you love.",
    },
    {
        image: '/feature-memories.jpg',
        title: 'Keep your reading memories',
        text: 'Set a yearly goal, save your favorites and look back on every book you finished.',
    },
    {
        image: '/feature-cozy.jpg',
        title: 'A cozy, ad-free space',
        text: 'No ads and no noisy feeds. Just you, your books and a few kind people.',
    },
    {
        image: '/feature-anywhere.jpg',
        title: 'Read from anywhere',
        text: 'Works in any browser, on your laptop or on your phone.',
    },
];

function FeaturesPages() {
    return (
        <div className="public-page">
            <PublicHeader />

            <main>
                <section className="public-hero public-hero-features">
                    <div className="public-hero-text">
                        <p className="public-eyebrow">Features</p>
                        <h1 className="display public-hero-title">
                            Small tools for a bigger reading journey
                            <span className="public-title-heart">
                                <Icon name="favorites" size={36} />
                            </span>
                        </h1>

                        <p className="public-hero-lead">
                            Everything you need to keep your reading life in one cozy place,
                            and nothing that gets in the way of the books.
                        </p>
                    </div>
                </section>

                <ul className="features-grid">
                    {FEATURES.map((feature) => (
                        <li key={feature.title} className="features-item">
                            <img src={feature.image} alt="" className="features-image" />
                            <h2 className="display features-title">{feature.title}</h2>
                            <p className="features-text">{feature.text}</p>
                        </li>
                    ))}
                </ul>

                <PublicBand
                    quote="Good tools for brighter days."
                    text="More than features, it's a home for your reading life."
                />
            </main>

            <PublicFooter />
        </div>
    );
}

export default FeaturesPages;