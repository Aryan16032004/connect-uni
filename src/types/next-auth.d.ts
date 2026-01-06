import NextAuth, { DefaultSession } from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
    /**
     * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
     */
    interface Session {
        user: {
            /** The user's unique ID */
            id: string;
            /** The user's role */
            role: string;
            /** The user's avatar */
            avatar?: string;
            /** The user's profile picture URL */
            image?: string;
        } & DefaultSession["user"];
    }

    interface User {
        role: string;
        id: string;
        avatar?: string;
        image?: string;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        role: string;
        id: string;
        avatar?: string;
        image?: string;
    }
}
