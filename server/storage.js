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

// Deletes an old photo from the bucket. Only photos that live in our bucket:
// old local ones (/uploads/...) or empty values are ignored.
async function deleteAvatar(publicUrl) {
    const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl('');
    const bucketUrl = data.publicUrl; // ".../storage/v1/object/public/avatars/"

    if (!publicUrl || !publicUrl.startsWith(bucketUrl)) return;

    const fileName = publicUrl.slice(bucketUrl.length);

    // The new photo is already saved, so a failed delete is only logged.
    try {
        const { error } = await supabase.storage.from(AVATAR_BUCKET).remove([fileName]);
        if (error) throw error;
    } catch (error) {
        console.error(`Could not delete the old photo ${fileName}: ${error.message}`);
    }
}

module.exports = { uploadAvatar, deleteAvatar };