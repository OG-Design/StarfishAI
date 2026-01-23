import 'express-session'

declare module 'http' {
    interface IncomingMessage {
        session?: SessionData & {user?:any};
    }
}

declare module 'express-session' {
    interface SessionData {
        user: any
    }
}