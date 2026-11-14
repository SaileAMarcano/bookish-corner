import QRCode from 'qrcode';

const WIDTH = 1080;
const HEIGHT = 1920;
const INK = '#2D241F';
const PLUM = '#8B515E';
const CREAM = '#FAF4E8';

const STAR_COLORS = { gold: '#F6C94E', rose: '#EBA3B4', sage: '#A3BC8C' };
const STARS = [
    [899, 823, 12, 'gold'], [465, 117, 16, 'rose'], [975, 1640, 16, 'sage'], [948, 482, 30, 'gold'],
    [808, 229, 12, 'rose'], [138, 759, 24, 'sage'], [1024, 1166, 16, 'gold'], [972, 63, 24, 'rose'],
    [99, 426, 14, 'sage'], [153, 1031, 16, 'gold'], [51, 1533, 20, 'rose'], [72, 1275, 30, 'sage'],
    [931, 1414, 10, 'gold'], [35, 1845, 20, 'rose'], [422, 775, 10, 'sage'], [427, 1639, 10, 'gold'],
    [247, 41, 24, 'rose'], [995, 1880, 16, 'sage'], [682, 1462, 14, 'gold'], [657, 756, 10, 'rose'],
    [303, 1876, 24, 'sage'], [37, 145, 24, 'gold'],
];

const FONTS = [
    '600 98px Fraunces',
    'italic 500 106px Fraunces',
    '500 32px Inter',
    '600 24px Inter',
    '700 30px Inter',
];

function loadImage(src, crossOrigin) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        if (crossOrigin) image.crossOrigin = 'anonymous';
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = src;
    });
}

function setFont(ctx, font, spacing = 0) {
    ctx.font = font;
    if ('letterSpacing' in ctx) ctx.letterSpacing = spacing + 'px';
}

function fitText(ctx, text, maxWidth) {
    if (ctx.measureText(text).width <= maxWidth) return text;
    let short = text;
    while (short.length > 1 && ctx.measureText(short + '…').width > maxWidth) {
        short = short.slice(0, -1);
    }
    return short + '…';
}

function roundBox(ctx, x, y, width, height, radius, fill, stroke, lineWidth) {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    if (fill) {
        ctx.fillStyle = fill;
        ctx.fill();
    }
    if (stroke) {
        ctx.lineWidth = lineWidth;
        ctx.strokeStyle = stroke;
        ctx.stroke();
    }
}

function drawStar(ctx, x, y, radius, color) {
    const k = 0.16 * radius;
    ctx.beginPath();
    ctx.moveTo(x, y - radius);
    ctx.quadraticCurveTo(x + k, y - k, x + radius, y);
    ctx.quadraticCurveTo(x + k, y + k, x, y + radius);
    ctx.quadraticCurveTo(x - k, y + k, x - radius, y);
    ctx.quadraticCurveTo(x - k, y - k, x, y - radius);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 18;
    ctx.fill();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
}

function drawQr(ctx, link, x, y, size) {
    const { modules } = QRCode.create(link, { errorCorrectionLevel: 'H' });
    const cell = size / modules.size;

    ctx.fillStyle = INK;
    for (let row = 0; row < modules.size; row++) {
        for (let column = 0; column < modules.size; column++) {
            if (modules.get(row, column)) {
                const left = Math.floor(x + column * cell);
                const top = Math.floor(y + row * cell);
                ctx.fillRect(left, top, Math.ceil(x + (column + 1) * cell) - left, Math.ceil(y + (row + 1) * cell) - top);
            }
        }
    }
}

export async function drawProfileCard({ link, displayName, username, avatarSrc, stats, texts }) {
    await Promise.all(FONTS.map((font) => document.fonts.load(font).catch(() => null)));

    const [logo, mark, avatar] = await Promise.all([
        loadImage('/logo.png'),
        loadImage('/logo-mark.png'),
        loadImage(avatarSrc, true).catch(() => loadImage('/default-avatar.png')),
    ]);

    const canvas = document.createElement('canvas');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const ctx = canvas.getContext('2d');

    const background = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    background.addColorStop(0, CREAM);
    background.addColorStop(0.45, '#F5E4E0');
    background.addColorStop(1, '#E9C9CD');
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    const glow = ctx.createRadialGradient(540, 1190, 0, 540, 1190, 700);
    glow.addColorStop(0, 'rgba(255, 248, 238, 1)');
    glow.addColorStop(1, 'rgba(255, 248, 238, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    for (const [x, y, radius, tone] of STARS) drawStar(ctx, x, y, radius, STAR_COLORS[tone]);

    const logoHeight = 118;
    ctx.drawImage(logo, 84, 84, (logo.width * logoHeight) / logo.height, logoHeight);

    setFont(ctx, '700 24px Inter', 4.3);
    const tagWidth = ctx.measureText(texts.tag).width + 56;
    roundBox(ctx, WIDTH - 84 - tagWidth, 113, tagWidth, 60, 30, 'rgba(250, 244, 232, 0.7)', PLUM, 2);
    ctx.fillStyle = PLUM;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(texts.tag, WIDTH - 84 - tagWidth / 2 + 2, 144);

    ctx.textBaseline = 'alphabetic';
    setFont(ctx, '600 98px Fraunces');
    ctx.fillStyle = INK;
    ctx.fillText(fitText(ctx, texts.title, 960), 540, 386);
    setFont(ctx, 'italic 500 106px Fraunces');
    ctx.fillStyle = PLUM;
    ctx.fillText('A Library of Us', 540, 490);

    roundBox(ctx, 150, 560, 780, 150, 40, 'rgba(255, 251, 244, 0.88)', INK, 3);
    ctx.save();
    ctx.beginPath();
    ctx.arc(239, 635, 52, 0, Math.PI * 2);
    ctx.fillStyle = '#F8F4E9';
    ctx.fill();
    ctx.clip();
    const side = Math.min(avatar.width, avatar.height);
    ctx.drawImage(avatar, (avatar.width - side) / 2, (avatar.height - side) / 2, side, side, 187, 583, 104, 104);
    ctx.restore();
    ctx.beginPath();
    ctx.arc(239, 635, 52, 0, Math.PI * 2);
    ctx.lineWidth = 3;
    ctx.strokeStyle = INK;
    ctx.stroke();

    ctx.textAlign = 'left';
    setFont(ctx, '600 50px Fraunces');
    ctx.fillStyle = INK;
    ctx.fillText(fitText(ctx, displayName, 570), 321, 632);
    setFont(ctx, '500 32px Inter');
    ctx.fillStyle = '#6F675E';
    ctx.fillText(fitText(ctx, '@' + username, 570), 321, 674);

    ctx.save();
    ctx.shadowColor = 'rgba(139, 81, 94, 0.18)';
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 18;
    roundBox(ctx, 250, 830, 580, 580, 34, '#FFFFFF');
    ctx.restore();
    roundBox(ctx, 250, 830, 580, 580, 34, null, INK, 4);
    drawQr(ctx, link, 292, 872, 496);

    roundBox(ctx, 474, 1054, 132, 132, 30, '#FFFFFF', INK, 4);
    const markHeight = 104;
    const markWidth = (mark.width * markHeight) / mark.height;
    ctx.drawImage(mark, 540 - markWidth / 2, 1120 - markHeight / 2, markWidth, markHeight);

    ctx.textAlign = 'center';
    setFont(ctx, '700 30px Inter', 6);
    ctx.fillStyle = PLUM;
    ctx.fillText(texts.scan, 543, 1534);
    setFont(ctx, '500 34px Inter');
    ctx.fillStyle = '#3F3631';
    ctx.fillText(fitText(ctx, texts.lead, 980), 540, 1588);

    roundBox(ctx, 110, 1680, 860, 150, 36, PLUM, INK, 3);
    ctx.strokeStyle = 'rgba(250, 244, 232, 0.35)';
    ctx.lineWidth = 2;
    for (const x of [397, 683]) {
        ctx.beginPath();
        ctx.moveTo(x, 1710);
        ctx.lineTo(x, 1800);
        ctx.stroke();
    }
    stats.forEach((stat, index) => {
        const x = 254 + index * 286;
        ctx.fillStyle = CREAM;
        setFont(ctx, '600 54px Fraunces');
        ctx.fillText(String(stat.number ?? 0), x, 1760);
        setFont(ctx, '600 24px Inter', 1.4);
        ctx.fillText(fitText(ctx, stat.label, 250), x, 1797);
    });

    setFont(ctx, '700 24px Inter', 5.3);
    ctx.fillStyle = PLUM;
    ctx.fillText('ALIBRARYOFUS.COM', 543, 1878);

    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('canvas'))), 'image/png');
    });
}
