const crypto = require('crypto');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env'), quiet: true });
const { createClient } = require('@supabase/supabase-js');


if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) {
    throw new Error('SUPABASE_URL or SUPABASE_SECRET_KEY is missing in server/.env');
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false },
});

const AVATAR_BUCKET = 'avatars';
const EXTENSIONS = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif' };


async function uploadAvatar(file) {
    const fileName = `${crypto.randomUUID()}.${EXTENSIONS[file.mimetype]}`;

    const { error } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(fileName, file.buffer, { contentType: file.mimetype });

    if (error) {
        throw new Error(`Could not upload the photo: ${error.message}`);
    }

    const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(fileName);
    return data.publicUrl;
}

module.exports = { uploadAvatar };