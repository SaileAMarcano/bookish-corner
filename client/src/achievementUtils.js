export const ACHIEVEMENT_TONES = {
    'beta-tester': 'rose',
    'a-new-reader': 'sage',
    'first-chapter': 'peach',
    'first-review': 'lavender',
    'first-page': 'blush',
    'keep-turning-pages': 'sage',
    bookworm: 'peach',
    'thoughtful-reader': 'lavender',
    'book-collector': 'blush',
    'genre-wanderer': 'sage',
    'five-stars': 'peach',
    'kindred-spirit': 'lavender',
    'book-talk': 'blush',
    'goal-reached': 'sage',
};

export const CONSTELLATION_POINTS = [
    [140, 52], [99, 82], [176, 88], [213, 116], [67, 126], [109, 153], [156, 140],
    [201, 180], [63, 208], [121, 218], [167, 242], [215, 259], [105, 282], [142, 312],
];

export function achievementLevel(milestone) {
    if (milestone.achieved) return 'gold';
    return milestone.progress > 0 ? 'silver' : 'dim';
}
