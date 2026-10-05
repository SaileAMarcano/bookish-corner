import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Icon from './Icon';
import { apiFetch } from './api';
import { slugify } from './utils';

const TAGS_MAX = 10;
const TAG_MAX_LENGTH = 40;
const WAIT_MS = 250;

function TagInput({ tags, onChange }) {
    const { t } = useTranslation();
    const [draft, setDraft] = useState('');
    const [results, setResults] = useState({ term: '', items: [] });

    const cleanDraft = draft.trim().replace(/^#+/, '');
    const chosenSlugs = tags.map((tag) => slugify(tag));
    const isFull = tags.length >= TAGS_MAX;

    useEffect(() => {
        if (cleanDraft === '') return;

        let ignore = false;
        const timer = setTimeout(() => {
            apiFetch(`/api/tags?q=${encodeURIComponent(cleanDraft)}`)
                .then((data) => {
                    if (!ignore) setResults({ term: cleanDraft, items: data });
                })
                .catch(() => {
                    if (!ignore) setResults({ term: cleanDraft, items: [] });
                });
        }, WAIT_MS);

        return () => {
            ignore = true;
            clearTimeout(timer);
        };
    }, [cleanDraft]);

    const suggestions = results.term === cleanDraft && cleanDraft !== ''
        ? results.items.filter((item) => !chosenSlugs.includes(item.slug))
        : [];

    const addTags = (names) => {
        const next = [...tags];
        const slugs = [...chosenSlugs];

        for (const raw of names) {
            const name = raw.trim().replace(/^#+/, '').replace(/\s+/g, ' ').slice(0, TAG_MAX_LENGTH);
            const slug = slugify(name);
            if (slug === '' || slugs.includes(slug) || next.length >= TAGS_MAX) continue;

            next.push(name);
            slugs.push(slug);
        }

        if (next.length !== tags.length) onChange(next);
    };

    const removeTag = (index) => {
        onChange(tags.filter((tag, i) => i !== index));
    };

    const handleChange = (e) => {
        const value = e.target.value;
        if (value.includes(',')) {
            const parts = value.split(',');
            const last = parts.pop();
            addTags(parts);
            setDraft(last);
        } else {
            setDraft(value);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addTags([draft]);
            setDraft('');
        } else if (e.key === 'Backspace' && draft === '' && tags.length > 0) {
            removeTag(tags.length - 1);
        } else if (e.key === 'Escape') {
            setDraft('');
        }
    };

    const chooseSuggestion = (name) => {
        addTags([name]);
        setDraft('');
    };

    return (
        <div className="tag-input">
            <div className="tag-input-box">
                <span className="tag-input-hash" aria-hidden="true">#</span>

                {tags.map((tag, index) => (
                    <span key={slugify(tag)} className="pill tag-pill">
                        #{tag}
                        <button
                            type="button"
                            onClick={() => removeTag(index)}
                            aria-label={t('posts.removeTag', { name: tag })}
                        >
                            <Icon name="close" size={12} />
                        </button>
                    </span>
                ))}

                <input
                    className="tag-input-field"
                    value={draft}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    placeholder={isFull ? '' : t('posts.tagsPlaceholder')}
                    aria-label={t('posts.tagsPlaceholder')}
                    maxLength={TAG_MAX_LENGTH}
                    disabled={isFull}
                />

                <span className="tag-input-count">{tags.length}/{TAGS_MAX}</span>
            </div>

            {suggestions.length > 0 && (
                <ul className="tag-suggestions" aria-label={t('posts.tagSuggestions')}>
                    {suggestions.map((item) => (
                        <li key={item.slug}>
                            <button type="button" onClick={() => chooseSuggestion(item.name)}>
                                <span>#{item.name}</span>
                                <span className="tag-suggestion-uses">{t('posts.tagUses', { count: item.uses })}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export default TagInput