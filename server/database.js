// Everything that talks to PostgreSQL lives here.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env'), quiet: true });
const { Pool, types } = require('pg');

types.setTypeParser(types.builtins.INT8, (value) => parseInt(value, 10));
types.setTypeParser(types.builtins.NUMERIC, (value) => parseFloat(value));

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const toCamel = (text) => text.replace(/_([a-z0-9])/g, (match, letter) => letter.toUpperCase());

function camelRow(row) {
    const result = {};
    for (const key in row) {
        result[toCamel(key)] = row[key];
    }
    return result;
}

async function query(text, params) {
    const result = await pool.query(text, params);
    return result.rows.map(camelRow);
}

module.exports = { pool, query };