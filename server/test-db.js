const { query, pool } = require('./database');

async function main() {
    const rows = await query(`
        SELECT current_database() AS database_name,
               current_user AS user_name,
               COUNT(*) AS table_count,
               3.5::NUMERIC(2, 1) AS sample_rating
        FROM information_schema.tables
        WHERE table_schema = 'public'
    `);
    console.log(rows[0]);
    await pool.end();
}

main().catch((error) => {
    console.error('Could not connect to Postgres:', error.message);
    process.exit(1);
});