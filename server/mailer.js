const { Resend } = require('resend');

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.MAIL_FROM || 'A Library of Us <no-reply@alibraryofus.com>';

const RESET_EMAIL = {
    en: {
        subject: 'Reset your A Library of Us password',
        title: 'Reset your password',
        body: 'Someone (hopefully you) asked to reset the password of your A Library of Us account. The link works for 1 hour.',
        button: 'Choose a new password',
        ignore: "If it wasn't you, you can ignore this email. Your password won't change.",
    },
    es: {
        subject: 'Restablece tu contraseña de A Library of Us',
        title: 'Restablece tu contraseña',
        body: 'Alguien (esperamos que tú) pidió restablecer la contraseña de tu cuenta de A Library of Us. El enlace funciona durante 1 hora.',
        button: 'Elegir una contraseña nueva',
        ignore: 'Si no fuiste tú, puedes ignorar este correo. Tu contraseña no cambiará.',
    },
};

async function sendMail({ to, subject, html, text }) {
    if (!resend) {
        console.log(`[mail] ${to} · ${subject}\n${text}`);
        return;
    }

    const { error } = await resend.emails.send({ from: FROM, to, subject, html, text });

    if (error) {
        throw new Error(error.message);
    }
}

function sendResetEmail(to, language, link) {
    const copy = RESET_EMAIL[language] || RESET_EMAIL.en;

    const html = `
        <div style="background:#FAF4E8;padding:32px 16px;font-family:Georgia,serif;color:#2D241F">
            <div style="max-width:480px;margin:0 auto;background:#FFFFFF;border:1px solid #E8DCC8;padding:32px">
                <p style="margin:0 0 8px;font-size:14px;color:#8B515E">A Library of Us</p>
                <h1 style="margin:0 0 16px;font-size:24px">${copy.title}</h1>
                <p style="margin:0 0 24px;font-size:16px;line-height:1.5">${copy.body}</p>
                <a href="${link}" style="display:inline-block;background:#8B515E;color:#FFFFFF;padding:12px 20px;text-decoration:none;font-size:16px">${copy.button}</a>
                <p style="margin:24px 0 0;font-size:13px;line-height:1.5;color:#6B5E57">${copy.ignore}</p>
            </div>
        </div>
    `;
    const text = `${copy.title}\n\n${copy.body}\n\n${link}\n\n${copy.ignore}`;

    return sendMail({ to, subject: copy.subject, html, text });
}

module.exports = { sendMail, sendResetEmail };