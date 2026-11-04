export const ACHIEVEMENT_ICONS = {
    'beta-tester': 'moon',
    'a-new-reader': 'bookmark',
    'first-chapter': 'library',
    'first-review': 'feather',
    'first-page': 'posts',
    'keep-turning-pages': 'reading',
    bookworm: 'library',
    'thoughtful-reader': 'feather',
    'book-collector': 'lists',
    'genre-wanderer': 'genres',
    'five-stars': 'reviews',
    'kindred-spirit': 'following',
    'book-talk': 'comment',
    'goal-reached': 'sparkle',
};

export const CONSTELLATION_POINTS = [
    [140, 52], [99, 82], [176, 88], [213, 116], [67, 126], [109, 153], [156, 140],
    [201, 180], [63, 208], [121, 218], [167, 242], [215, 259], [105, 282], [142, 312],
];

export function achievementLevel(milestone) {
    if (milestone.achieved) return 'gold';
    return milestone.progress > 0 ? 'silver' : 'dim';
}
