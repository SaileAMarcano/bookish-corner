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
const POST_IMAGE_BUCKET = 'post-images';
const EXTENSIONS = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif' };


async function uploadImage(bucket, file) {
    const fileName = `${crypto.randomUUID()}.${EXTENSIONS[file.mimetype]}`;

    const { error } = await supabase.storage
        .from(bucket)
        .upload(fileName, file.buffer, { contentType: file.mimetype });

    if (error) {
        throw new Error(`Could not upload the image: ${error.message}`);
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
    return data.publicUrl;
}

async function deleteImage(bucket, publicUrl) {
    const { data } = supabase.storage.from(bucket).getPublicUrl('');
    const bucketUrl = data.publicUrl;

    if (!publicUrl || !publicUrl.startsWith(bucketUrl)) return;

    const fileName = publicUrl.slice(bucketUrl.length);

    try {
        const { error } = await supabase.storage.from(bucket).remove([fileName]);
        if (error) throw error;
    } catch (error) {
        console.error(`Could not delete the image ${fileName}: ${error.message}`);
    }
}

const uploadAvatar = (file) => uploadImage(AVATAR_BUCKET, file);
const deleteAvatar = (publicUrl) => deleteImage(AVATAR_BUCKET, publicUrl);
const uploadPostImage = (file) => uploadImage(POST_IMAGE_BUCKET, file);
const deletePostImage = (publicUrl) => deleteImage(POST_IMAGE_BUCKET, publicUrl);

module.exports = { uploadAvatar, deleteAvatar, uploadPostImage, deletePostImage };
