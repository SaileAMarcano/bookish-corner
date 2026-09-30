// Everything that talks to PostgreSQL lives here.
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env'), quiet: true });
const { Pool, types } = require('pg');

types.setTypeParser(types.builtins.INT8, (value) => parseInt(value, 10));
types.setTypeParser(types.builtins.NUMERIC, (value) => parseFloat(value));

// In the cloud (Supabase) the connection is encrypted and checked against Supabase's certificate.
// On my PC there is no DATABASE_CA, so no SSL.
const caFile = process.env.DATABASE_CA;
const ssl = caFile ? { ca: fs.readFileSync(path.join(__dirname, caFile), 'utf8') } : false;

// A pool keeps a few connections open and reuses them.
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl });

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