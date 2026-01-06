import { Server as NetServer } from "http";
import { NextApiRequest } from "next";
import { Server as ServerIO } from "socket.io";
import { NextApiResponse } from "next";

export type NextApiResponseServerIo = NextApiResponse & {
    socket: any & {
        server: NetServer & {
            io: ServerIO;
        };
    };
};

export const config = {
    api: {
        bodyParser: false,
    },
};

const ioHandler = (req: NextApiRequest, res: NextApiResponseServerIo) => {
    if (!res.socket.server.io) {
        const path = "/api/socket/io";
        const httpServer: NetServer = res.socket.server as any;

        const io = new ServerIO(httpServer, {
            path: path,
            addTrailingSlash: false,
        });

        // Track online users: Map<userId, socketId>
        const onlineUsers = new Map<string, string>();

        io.on("connection", (socket) => {
            console.log("SERVER: Socket Connected:", socket.id);

            socket.on("register-user", (userId: string) => {
                onlineUsers.set(userId, socket.id);
                // Broadcast to all clients that this user is online
                io.emit("user:online", userId);

                // Send current online users to the newly connected user
                const onlineUserIds = Array.from(onlineUsers.keys());
                socket.emit("users:online", onlineUserIds);

                console.log(`SERVER: User registered: ${userId}`);
            });

            socket.on("join-room", (roomId: string) => {
                socket.join(roomId);
                console.log(`SERVER: Socket ${socket.id} joined room ${roomId}`);
            });

            socket.on("send-message", (message: any) => {
                const room = message.channelId || message.conversationId || message.room;
                console.log(`SERVER: Receive send-message for room: ${room}`);
                if (room) {
                    console.log(`SERVER: Broadcasting to ${room}`);
                    io.to(room).emit("new-message", message);
                } else {
                    console.log("SERVER: Missing Room ID in message:", message);
                }
            });

            socket.on("typing", (data: any) => {
                const room = data.room || data.channelId || data.conversationId;
                if (room) {
                    socket.to(room).emit("typing", data);
                }
            });

            socket.on("disconnect", () => {
                console.log("SERVER: Socket Disconnected:", socket.id);
                // Find and remove the user who disconnected
                for (const [userId, socketId] of onlineUsers.entries()) {
                    if (socketId === socket.id) {
                        onlineUsers.delete(userId);
                        io.emit("user:offline", userId);
                        console.log(`SERVER: User disconnected: ${userId}`);
                        break;
                    }
                }
            });
        });

        res.socket.server.io = io;
    } else {
        console.log("SERVER: Socket.io already running");
    }

    res.end();
};

export default ioHandler;
