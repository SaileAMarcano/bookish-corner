const { query } = require('./database');

const BETA_ENDS_AT = new Date('2027-03-01T00:00:00Z');

const MILESTONES = [
    { key: 'beta-tester', stat: 'betaTester', goal: 1 },
    { key: 'a-new-reader', stat: 'books', goal: 1 },
    { key: 'first-chapter', stat: 'finished', goal: 1 },
    { key: 'first-review', stat: 'reviews', goal: 1 },
    { key: 'first-page', stat: 'posts', goal: 1 },
    { key: 'keep-turning-pages', stat: 'finished', goal: 5 },
    { key: 'bookworm', stat: 'finished', goal: 10 },
    { key: 'thoughtful-reader', stat: 'reviews', goal: 5 },
    { key: 'book-collector', stat: 'books', goal: 25 },
    { key: 'genre-wanderer', stat: 'genres', goal: 5 },
    { key: 'five-stars', stat: 'fiveStars', goal: 1 },
    { key: 'kindred-spirit', stat: 'following', goal: 5 },
    { key: 'book-talk', stat: 'comments', goal: 10 },
    { key: 'goal-reached', stat: 'finishedThisYear', goal: null },
];

async function readerStats(userId) {
    const [stats] = await query(`
        SELECT u.created_at, u.reading_goal,
               (SELECT COUNT(*) FROM user_books WHERE user_id = u.id) AS books,
               (SELECT COUNT(*) FROM user_books
                WHERE user_id = u.id AND status = 'finished') AS finished,
               (SELECT COUNT(*) FROM user_books
                WHERE user_id = u.id AND status = 'finished'
                  AND EXTRACT(YEAR FROM finished_at) = EXTRACT(YEAR FROM now())) AS finished_this_year,
               (SELECT COUNT(*) FROM user_books
                WHERE user_id = u.id AND review IS NOT NULL AND trim(review) <> '') AS reviews,
               (SELECT COUNT(DISTINCT genre) FROM user_books
                WHERE user_id = u.id AND status = 'finished' AND genre IS NOT NULL) AS genres,
               (SELECT COUNT(*) FROM user_books WHERE user_id = u.id AND rating = 5) AS five_stars,
               (SELECT COUNT(*) FROM posts WHERE user_id = u.id) AS posts,
               (SELECT COUNT(*) FROM follows WHERE follower_id = u.id) AS following,
               (SELECT COUNT(*) FROM post_comments WHERE user_id = u.id)
                 + (SELECT COUNT(*) FROM comments WHERE user_id = u.id) AS comments
        FROM users u
        WHERE u.id = $1
    `, [userId]);

    stats.betaTester = stats.createdAt < BETA_ENDS_AT ? 1 : 0;
    return stats;
}

async function syncMilestones(userId) {
    const stats = await readerStats(userId);
    const goalOf = (milestone) => milestone.goal ?? stats.readingGoal;

    const reached = MILESTONES
        .filter((milestone) => goalOf(milestone) && stats[milestone.stat] >= goalOf(milestone))
        .map((milestone) => milestone.key);

    if (reached.length > 0) {
        await query(`
            INSERT INTO user_milestones (user_id, milestone_key)
            SELECT $1, unnest($2::text[])
            ON CONFLICT DO NOTHING
        `, [userId, reached]);
    }

    const rows = await query(
        'SELECT milestone_key, achieved_at, seen_at, claimed_at FROM user_milestones WHERE user_id = $1',
        [userId]
    );
    const saved = new Map(rows.map((row) => [row.milestoneKey, row]));

    return MILESTONES.map((milestone) => {
        const row = saved.get(milestone.key);
        const goal = goalOf(milestone) || null;

        return {
            key: milestone.key,
            goal,
            progress: goal ? Math.min(stats[milestone.stat], goal) : stats[milestone.stat],
            achieved: Boolean(row),
            achievedAt: row ? row.achievedAt : null,
            seen: Boolean(row && row.seenAt),
            claimed: Boolean(row && row.claimedAt),
        };
    });
}

module.exports = { MILESTONES, syncMilestones };