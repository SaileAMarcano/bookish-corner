const designs = [
    <>
        <path fill="var(--spine-accent)" d="M4 21Q29 27 56 21V36Q31 42 4 36Z M4 220Q29 227 56 220V234Q29 241 4 235Z" />
        <path fill="none" d="M5 45Q30 50 55 44M5 212Q31 218 55 211" />
    </>,
    <>
        <path fill="var(--spine-detail)" d="M19 32C18 24 23 20 30 20C37 19 42 24 42 31C42 38 37 42 30 42C23 42 19 38 19 32Z" />
        <path fill="var(--spine-accent)" d="M4 222Q31 229 56 221V237Q30 243 4 237Z" />
    </>,
    <>
        <path fill="var(--spine-accent)" d="M4 17Q30 12 56 18V49Q30 44 4 49Z M4 224Q30 230 56 224V236Q30 242 4 236Z" />
        <path fill="none" d="M13 34C18 24 23 24 28 33S39 42 47 32" />
    </>,
    <>
        <path fill="var(--spine-accent)" d="M4 17Q30 23 56 17V26Q30 32 4 26Z M4 229Q30 234 56 228V240Q30 245 4 240Z" />
        <circle cx="17" cy="44" r="3.4" fill="var(--spine-detail)" />
        <circle cx="30" cy="42" r="4.1" fill="var(--spine-detail)" />
        <circle cx="43" cy="44" r="3.4" fill="var(--spine-detail)" />
    </>,
    <>
        <path fill="var(--spine-accent)" d="M4 22Q30 16 56 23V36Q29 29 4 36Z" />
        <path fill="none" d="M24 246Q29 228 37 213" />
        <path fill="var(--spine-detail)" d="M29 232Q17 231 17 220Q28 220 29 232Z M31 229Q35 219 46 222Q42 232 31 229Z M35 217Q27 210 33 203Q41 208 35 217Z" />
    </>,
    <>
        <path fill="var(--spine-detail)" d="M30 45C24 40 17 33 19 27C21 20 27 22 30 27C34 21 41 21 42 27C44 34 36 41 30 45Z" />
        <path fill="var(--spine-accent)" d="M4 214Q30 221 56 214V236Q30 243 4 236Z" />
        <path fill="none" d="M5 225Q29 232 55 225" />
    </>,
    <>
        <path fill="var(--spine-accent)" d="M4 46Q30 52 56 45V54Q30 60 4 54Z M4 223Q29 230 56 223V236Q30 242 4 236Z" />
        <path fill="none" d="M22 25V26M38 24V25M25 34Q30 41 36 33" />
        <path fill="none" stroke="var(--spine-detail)" d="M13 33L16 34M44 34L47 32" />
    </>,
    <>
        <path fill="var(--spine-accent)" d="M4 16Q29 12 56 17V48Q30 52 4 47Z M4 230Q29 236 56 229V240Q30 246 4 240Z" />
        <path fill="none" d="M21 29V30M39 30V31M25 36Q30 45 36 36" />
        <circle cx="30" cy="215" r="4" fill="var(--spine-detail)" />
    </>,
];

export default function SpineArt({ variant }) {
    return (
        <svg className="year-shelf-spine-art" viewBox="0 0 60 260" preserveAspectRatio="none"
            stroke="var(--spine-line)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
            aria-hidden="true" focusable="false">
            <path fill="var(--spine-color)" d="M4 16Q3 7 13 5Q28 0 45 4Q57 6 56 16V241Q57 252 45 255Q29 259 15 255Q3 253 4 242Z" />
            {designs[variant]}
        </svg>
    );
}

const flatDesigns = [
    <>
        <path fill="var(--spine-accent)" d="M10 2Q6 11 10 20H18Q14 11 18 2Z M84 2Q88 11 84 20H90Q94 11 90 2Z" />
        <path fill="var(--spine-detail)" d="M80 15Q72 13 73 6Q81 7 80 15Z" />
    </>,
    <>
        <path fill="var(--spine-accent)" d="M8 2Q4 11 8 20H13Q9 11 13 2Z M16 2Q12 11 16 20H20Q16 11 20 2Z M86 2Q90 11 86 20H92Q96 11 92 2Z" />
    </>,
    <>
        <path fill="var(--spine-accent)" d="M12 2Q8 11 12 20H20Q16 11 20 2Z M82 2Q86 11 82 20H90Q94 11 90 2Z" />
        <circle cx="76" cy="11" r="2" fill="var(--spine-detail)" />
        <circle cx="24" cy="11" r="2" fill="var(--spine-detail)" />
    </>,
    <>
        <path fill="var(--spine-accent)" d="M9 2Q5 11 9 20H17Q13 11 17 2Z" />
        <path fill="var(--spine-detail)" d="M83 5C80 3 77 5 78 8C79 11 83 14 83 14C83 14 88 11 89 8C90 5 86 3 83 5Z" />
        <path fill="none" d="M92 2Q96 11 92 20" />
    </>,
];

export function FlatSpineArt({ variant }) {
    return (
        <svg className="year-shelf-spine-art" viewBox="0 0 100 22" preserveAspectRatio="none"
            stroke="var(--spine-line)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
            aria-hidden="true" focusable="false">
            <path fill="var(--spine-color)" d="M5 2Q50 1 95 2Q101 11 95 20Q50 21 5 20Q-1 11 5 2Z" />
            {flatDesigns[variant]}
        </svg>
    );
}
