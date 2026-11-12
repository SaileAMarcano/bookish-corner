export const PASSWORD_RULES = [
    { label: 'auth.rules.length', test: (p) => p.length >= 8 },
    { label: 'auth.rules.number', test: (p) => /\d/.test(p) },
    { label: 'auth.rules.letter', test: (p) => /[a-z]/i.test(p) },
];