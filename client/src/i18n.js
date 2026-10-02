// Sets up the translations (i18next). Imported once, in main.jsx, before the app starts.
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en';
import es from './locales/es';

export const LANGUAGES = ['en', 'es'];
const STORAGE_KEY = 'bookish-language';

// The language chosen last time on this browser; if none, the browser's own language.
function startingLanguage() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (LANGUAGES.includes(saved)) return saved;
    } catch {
        // Private windows can block localStorage: just use the browser's language.
    }
    return navigator.language?.toLowerCase().startsWith('es') ? 'es' : 'en';
}

i18n.use(initReactI18next).init({
    resources: {
        en: { translation: en },
        es: { translation: es },
    },
    lng: startingLanguage(),
    fallbackLng: 'en',
    interpolation: { escapeValue: false }, // React already protects against HTML injection
});

// Every time the language changes: remember it and tell the browser (<html lang="...">).
i18n.on('languageChanged', (language) => {
    document.documentElement.lang = language;
    try {
        localStorage.setItem(STORAGE_KEY, language);
    } catch {
        // Not saved on this browser: no problem, the app keeps working.
    }
});

document.documentElement.lang = i18n.language;

export default i18n;
