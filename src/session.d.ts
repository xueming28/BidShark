import 'express-session';

declare module 'express-session' {
    interface SessionData {
        id: string;
        email: string;
        name?: string;
        isLoggedIn?: boolean;
        image: string;
        phoneNumber: string;
    }
}