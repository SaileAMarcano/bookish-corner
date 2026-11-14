import { useEffect, useState } from 'react';

export const SPINE_COLORS = [
    { key: 'plum', hex: '#8B515E' },
    { key: 'rose', hex: '#C8979F' },
    { key: 'blush', hex: '#E9A8B4' },
    { key: 'sage', hex: '#8E9980' },
    { key: 'mist', hex: '#A7B49A' },
    { key: 'lavender', hex: '#8F8DA8' },
    { key: 'night', hex: '#2E2A4A' },
    { key: 'wine', hex: '#4A1F2B' },
    { key: 'cocoa', hex: '#5C4033' },
    { key: 'ochre', hex: '#C9A24E' },
    { key: 'cream', hex: '#E9DFCB' },
    { key: 'ink', hex: '#3B3633' },
];

export const SPINE_MOTIFS = ['star', 'heart', 'flower', 'quill', 'key', 'planet', 'moon', 'hourglass', 'leaf', 'bubble'];

const GENRE_LOOK = {
    Fantasy: { tone: 6, motif: 'star' },
    Romance: { tone: 2, motif: 'heart' },
    'Dark Romance': { tone: 7, motif: 'heart' },
    Contemporary: { tone: 1, motif: 'flower' },
    Classics: { tone: 3, motif: 'quill' },
    Mystery: { tone: 11, motif: 'key' },
    'Sci-fi': { tone: 5, motif: 'planet' },
    Horror: { tone: 8, motif: 'moon' },
    Historical: { tone: 9, motif: 'hourglass' },
    'Non-fiction': { tone: 4, motif: 'leaf' },
    Poetry: { tone: 5, motif: 'flower' },
    Manga: { tone: 0, motif: 'bubble' },
    Comics: { tone: 9, motif: 'bubble' },
};

function rgbOf(hex) {
    const value = parseInt(hex.slice(1), 16);
    return [value >> 16, (value >> 8) & 255, value & 255];
}

export const SPINE_SATURATION = 35;
export const SPINE_LIGHTNESS = [18, 85];

export function spineColor(hue, lightness) {
    const s = SPINE_SATURATION / 100;
    const l = lightness / 100;
    const a = s * Math.min(l, 1 - l);
    const channel = (n) => {
        const k = (n + hue / 30) % 12;
        const value = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
        return Math.round(value * 255).toString(16).padStart(2, '0');
    };
    return '#' + channel(0) + channel(8) + channel(4);
}

export function spineSliders(hex) {
    const [r, g, b] = rgbOf(hex).map((value) => value / 255);
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    let hue = 0;

    if (delta > 0) {
        if (max === r) hue = ((g - b) / delta) % 6;
        else if (max === g) hue = (b - r) / delta + 2;
        else hue = (r - g) / delta + 4;
    }

    const lightness = Math.round(((max + min) / 2) * 100);
    return {
        hue: Math.round((hue * 60 + 360) % 360),
        lightness: Math.max(SPINE_LIGHTNESS[0], Math.min(SPINE_LIGHTNESS[1], lightness)),
    };
}

export function isLightColor(hex) {
    function luminance(color) {
        const [r, g, b] = rgbOf(color).map((value) => {
            const channel = value / 255;
            return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }
    const fill = luminance(hex);
    const darkContrast = (fill + 0.05) / (luminance('#2D241F') + 0.05);
    const lightContrast = (luminance('#FAF4E8') + 0.05) / (fill + 0.05);
    return darkContrast >= lightContrast;
}

export function genreLook(book, hash) {
    const look = GENRE_LOOK[book.genre] || GENRE_LOOK[book.workGenre];
    return look || { tone: hash % SPINE_COLORS.length, motif: 'star' };
}

function nearestTone([r, g, b]) {
    let best = 0;
    let bestDistance = Infinity;
    SPINE_COLORS.forEach(({ hex }, index) => {
        const [pr, pg, pb] = rgbOf(hex);
        const distance = 2 * (r - pr) ** 2 + 4 * (g - pg) ** 2 + 3 * (b - pb) ** 2;
        if (distance < bestDistance) {
            bestDistance = distance;
            best = index;
        }
    });
    return best;
}

const coverTones = new Map();

function readCoverTone(src) {
    if (coverTones.has(src)) return coverTones.get(src);

    const promise = new Promise((resolve) => {
        const image = new Image();
        image.crossOrigin = 'anonymous';
        image.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = 24;
                canvas.height = 36;
                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                ctx.drawImage(image, 0, 0, 24, 36);
                const { data } = ctx.getImageData(0, 0, 24, 36);
                let r = 0;
                let g = 0;
                let b = 0;
                let weight = 0;
                for (let index = 0; index < data.length; index += 4) {
                    const max = Math.max(data[index], data[index + 1], data[index + 2]);
                    const min = Math.min(data[index], data[index + 1], data[index + 2]);
                    const amount = 0.2 + (max - min) / 255;
                    r += data[index] * amount;
                    g += data[index + 1] * amount;
                    b += data[index + 2] * amount;
                    weight += amount;
                }
                resolve(nearestTone([r / weight, g / weight, b / weight]));
            } catch {
                resolve(null);
            }
        };
        image.onerror = () => resolve(null);
        image.src = src;
    });

    coverTones.set(src, promise);
    return promise;
}

export function useCoverTone(src) {
    const [result, setResult] = useState({ src: null, tone: null });

    useEffect(() => {
        if (typeof src !== 'string' || !src.startsWith('http')) return undefined;
        let ignore = false;
        readCoverTone(src).then((tone) => {
            if (!ignore) setResult({ src, tone });
        });
        return () => {
            ignore = true;
        };
    }, [src]);

    return result.src === src ? result.tone : null;
}
