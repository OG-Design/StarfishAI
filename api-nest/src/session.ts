import session from 'express-session';

export const sessionMiddleware = session({
    secret: "starfish-dev-secret-2026-change-me", // use a strong secret in production
    name: 'sid', // session cookie name
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: 'auto',  // auto: true if req comes over HTTPS
        maxAge: 3600000 * 24,
        sameSite: 'lax',
        path: '/',
    },
    // add a simple callback for debugging session creation
    store: undefined // default memory store for development
});

/**
 * Middleware that adjusts session cookie for cross-origin HTTPS requests.
 * SameSite=None (required for cross-origin cookies) only works with Secure (HTTPS).
 * Over plain HTTP, cross-origin cookies cannot work in modern browsers;
 * use a same-origin proxy (e.g. Vite proxy) instead.
 */
export function adaptSessionCookie(req: any, _res: any, next: any) {
    const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
    const origin = req.headers.origin || '';
    const host = req.headers.host || '';
    const isCrossOrigin = !!origin && !origin.includes(host);

    if (isCrossOrigin && isSecure && req.session?.cookie) {
        req.session.cookie.sameSite = 'none';
        req.session.cookie.secure = true;
    }
    next();
}