"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { io as ClientIO, Socket } from "socket.io-client";

type SocketContextType = {
    socket: any | null;
    isConnected: boolean;
    onlineUsers: Set<string>;
};

const SocketContext = createContext<SocketContextType>({
    socket: null,
    isConnected: false,
    onlineUsers: new Set(),
});

export const useSocket = () => {
    return useContext(SocketContext);
};

// We need the session to register the user
import { useSession } from "next-auth/react";

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
    const [socket, setSocket] = useState<any | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
    const { data: session } = useSession();

    useEffect(() => {
        // Get the URL dynamically. 
        // If on localhost, use undefined (defaults to current origin) to ensure we connect to local server.
        // Otherwise, use site URL or origin.
        const isLocal = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
        const socketUrl = isLocal
            ? undefined
            : (process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : ''));

        // Initialize the socket server via a fetch call to the API route
        const socketInit = async () => {
            await fetch("/api/socket/io");
        };
        socketInit();

        const socketInstance = new (ClientIO as any)(socketUrl, {
            path: "/api/socket/io",
            addTrailingSlash: false,
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: 5,
        });

        socketInstance.on("connect", () => {
            console.log("Socket.io: Connected with ID:", socketInstance.id);
            setIsConnected(true);

            // Register user if session exists
            if (session?.user?.id) {
                socketInstance.emit("register-user", session.user.id);
            }
        });

        socketInstance.on("connect_error", (error: any) => {
            console.error("Socket.io: Connection error:", error);
        });

        socketInstance.on("disconnect", () => {
            console.log("Socket.io: Disconnected");
            setIsConnected(false);
        });

        // Online status events
        socketInstance.on("users:online", (userIds: string[]) => {
            setOnlineUsers(new Set(userIds));
        });

        socketInstance.on("user:online", (userId: string) => {
            setOnlineUsers((prev) => {
                const newSet = new Set(prev);
                newSet.add(userId);
                return newSet;
            });
        });

        socketInstance.on("user:offline", (userId: string) => {
            setOnlineUsers((prev) => {
                const newSet = new Set(prev);
                newSet.delete(userId);
                return newSet;
            });
        });

        setSocket(socketInstance);

        return () => {
            socketInstance.disconnect();
        };
    }, [session?.user?.id]); // Re-run if session user changes

    return (
        <SocketContext.Provider value={{ socket, isConnected, onlineUsers }}>
            {children}
        </SocketContext.Provider>
    );
};
