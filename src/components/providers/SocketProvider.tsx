"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { io as ClientIO, Socket } from "socket.io-client";

type SocketContextType = {
    socket: any | null;
    isConnected: boolean;
};

const SocketContext = createContext<SocketContextType>({
    socket: null,
    isConnected: false,
});

export const useSocket = () => {
    return useContext(SocketContext);
};

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
    const [socket, setSocket] = useState<any | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        // Get the URL dynamically - use current origin if NEXT_PUBLIC_SITE_URL is not set
        const socketUrl = process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : '');
        
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
        });

        socketInstance.on("connect_error", (error: any) => {
            console.error("Socket.io: Connection error:", error);
        });

        socketInstance.on("disconnect", () => {
            console.log("Socket.io: Disconnected");
            setIsConnected(false);
        });

        setSocket(socketInstance);

        return () => {
            socketInstance.disconnect();
        };
    }, []);

    return (
        <SocketContext.Provider value={{ socket, isConnected }}>
            {children}
        </SocketContext.Provider>
    );
};
