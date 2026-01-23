import session from 'express-session';

export const sessionMiddleware = session({
    secret: "0",
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: false,
        maxAge: 3600000*24
    }
})