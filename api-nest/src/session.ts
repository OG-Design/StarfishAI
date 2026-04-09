import session from 'express-session';

const isSecure = process.env.SECURE === 'true';

export const sessionMiddleware = session({
    secret: process.env.SESSION_SECRET || "starfish-dev-secret-2026-change-me",
    name: 'sid', // session cookie name
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: isSecure,
        maxAge: 3600000 * 24,
        sameSite: 'lax',
        path: '/',
    },
    store: undefined // default memory store for development
});

/**
 * Middleware that adjusts session cookie for cross-origin HTTPS requests.
 * SameSite=None (required for cross-origin cookies) only works with Secure (HTTPS).
 * Over plain HTTP, cross-origin cookies cannot work in modern browsers;
 * use a same-origin proxy (e.g. Vite proxy) instead.
 */
export function adaptSessionCookie(req: any, _res: any, next: any) {
    const origin = req.headers.origin || '';
    const host = req.headers.host || '';
    const isCrossOrigin = !!origin && !origin.includes(host);

    if (isCrossOrigin && isSecure && req.session?.cookie) {
        req.session.cookie.sameSite = 'none';
        req.session.cookie.secure = true;
    }
    next();
}