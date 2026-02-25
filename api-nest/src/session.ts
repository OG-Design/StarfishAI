import session from 'express-session';

export const sessionMiddleware = session({
    secret: "starfish-dev-secret-2026-change-me", // use a strong secret in production
    name: 'sid', // session cookie name
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: false,
        maxAge: 3600000 * 24,
        sameSite: 'lax',
        path: '/',
    },
    // add a simple callback for debugging session creation
    store: undefined // default memory store for development
});