const PADDLE_SCRIPT = 'https://cdn.paddle.com/paddle/v2/paddle.js';

let loading = null;
let listener = null;

function loadScript() {
    if (window.Paddle) return Promise.resolve(window.Paddle);
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = PADDLE_SCRIPT;
        script.async = true;
        script.onload = () => resolve(window.Paddle);
        script.onerror = () => reject(new Error('paddle'));
        document.head.appendChild(script);
    });
}

export function loadPaddle({ environment, clientToken }) {
    if (!loading) {
        loading = loadScript().then((Paddle) => {
            if (environment === 'sandbox') Paddle.Environment.set('sandbox');
            Paddle.Initialize({
                token: clientToken,
                eventCallback: (event) => listener?.(event),
            });
            return Paddle;
        }).catch((error) => {
            loading = null;
            throw error;
        });
    }
    return loading;
}

export function onPaddleEvent(callback) {
    listener = callback;
    return () => {
        if (listener === callback) listener = null;
    };
}
