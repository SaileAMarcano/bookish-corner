
function cleanDescription(text) {
    if (!text) return null;

    let clean = text;

    clean = clean.split(/\n-{3,}/)[0];

    clean = clean.replace(/\[[^\]]*\]\(https?:\/\/[^)]*\)/g, '');

    clean = clean.replace(/https?:\/\/\S+/g, '');

    clean = clean.replace(/\s+/g, ' ').trim();

    return clean === '' ? null : clean;
}

function descriptionFrom(work) {
    if (!work || !work.description) return null;

    const text = typeof work.description === 'string' ? work.description : work.description.value;
    return cleanDescription(text);
}

function coverUrl(coverId) {
    return coverId > 0 ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg` : null;
}

module.exports = { descriptionFrom, coverUrl };