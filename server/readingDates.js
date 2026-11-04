function resolveReadingDates(book, changes, now = new Date()) {
    const yearGiven = changes.readYear !== undefined;
    const dateGiven = changes.finishedOn !== undefined;
    const currentYear = now.getUTCFullYear();
    const today = now.toISOString().slice(0, 10);
    const finishing = changes.status === 'finished' && book.status !== 'finished';
    let readYear = finishing ? currentYear : book.readYear ?? null;
    let finishedOn = finishing ? null : book.finishedOn ?? null;

    if (yearGiven) {
        readYear = changes.readYear;
        if (!dateGiven && (readYear === null || Number(finishedOn?.slice(0, 4)) !== readYear)) {
            finishedOn = null;
        }
    }

    if (dateGiven) {
        finishedOn = changes.finishedOn;
    }

    if (finishedOn !== null) {
        if (typeof finishedOn !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(finishedOn)) {
            return { error: 'completionDateInvalid' };
        }
        const date = new Date(finishedOn + 'T00:00:00.000Z');
        if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== finishedOn || finishedOn > today) {
            return { error: 'completionDateInvalid' };
        }
        if (dateGiven && !yearGiven) {
            readYear = Number(finishedOn.slice(0, 4));
        }
    }

    if (readYear !== null && (!Number.isInteger(readYear) || readYear < 1000 || readYear > currentYear)) {
        return { error: 'readingYearInvalid' };
    }
    if (finishedOn !== null && Number(finishedOn.slice(0, 4)) !== readYear) {
        return { error: 'completionYearMismatch' };
    }
    const nextStatus = changes.status ?? book.status;
    if (nextStatus !== 'finished' && ((yearGiven && readYear !== null) || (dateGiven && finishedOn !== null))) {
        return { error: 'completionDatesFinishedOnly' };
    }

    return { readYear, finishedOn };
}

module.exports = { resolveReadingDates };