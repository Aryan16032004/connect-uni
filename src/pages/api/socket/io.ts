import { Server as NetServer } from "http";
import { NextApiRequest } from "next";
import { Server as ServerIO } from "socket.io";
import { NextApiResponse } from "next";
import { setIoInstance, setOnlineUsers } from "@/lib/socket";

// Track WebRTC signaling participants per room
const roomParticipants = new Map<string, Set<string>>();
const socketUserMap = new Map<string, string>();

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

        // Store the io instance globally
        setIoInstance(io);

        // Track online users: Map<userId, socketId>
        const onlineUsers = new Map<string, string>();
        setOnlineUsers(onlineUsers);

        io.on("connection", (socket) => {
            console.log("SERVER: Socket Connected:", socket.id);

            socket.on("register-user", (userId: string) => {
                onlineUsers.set(userId, socket.id);
                socketUserMap.set(socket.id, userId);
                // Broadcast to all clients that this user is online
                io.emit("user:online", userId);

                // Send current online users to the newly connected user
                const onlineUserIds = Array.from(onlineUsers.keys());
                socket.emit("users:online", onlineUserIds);

                console.log(`SERVER: User registered: ${userId}`);
            });

            socket.on("join-room", (roomId: string) => {
                socket.join(roomId);
                console.log("[SIGNAL] join-room", { socketId: socket.id, roomId });
            });

            socket.on("webrtc:join", ({ roomId, userId }: { roomId: string; userId: string }) => {
                socket.join(roomId);
                socketUserMap.set(socket.id, userId);

                const peers = roomParticipants.get(roomId) || new Set<string>();
                const existingPeers = Array.from(peers).filter((id) => id !== socket.id);

                peers.add(socket.id);
                roomParticipants.set(roomId, peers);

                socket.emit("webrtc:peers", {
                    peers: existingPeers.map((id) => ({ socketId: id, userId: socketUserMap.get(id) })),
                });

                socket.to(roomId).emit("webrtc:peer-joined", { socketId: socket.id, userId });
                console.log(`[SIGNAL] webrtc:join roomId=${roomId} socket=${socket.id}. Total peers in room: ${peers.size}`);
                console.log(`[SIGNAL] Current Room Participants:`, Array.from(roomParticipants.entries()).map(([k, v]) => `${k}: [${Array.from(v).join(', ')}]`));
            });

            socket.on(
                "webrtc:signal",
                ({ to, type, description, candidate, userId }: { to: string; type: string; description?: any; candidate?: any; userId?: string }) => {
                    const targetRoom = Array.from(roomParticipants.entries()).find(([_, peers]) => peers.has(to))?.[0];
                    io.to(to).emit("webrtc:signal", {
                        from: socket.id,
                        type,
                        description,
                        candidate,
                        userId,
                    });
                    console.log(`[SIGNAL] webrtc:signal from=${socket.id} to=${to} type=${type} room=${targetRoom}`);
                }
            );

            socket.on("webrtc:leave", ({ roomId }: { roomId: string }) => {
                const peers = roomParticipants.get(roomId);
                if (peers) {
                    peers.delete(socket.id);
                    socket.to(roomId).emit("webrtc:peer-left", { socketId: socket.id });
                    if (peers.size === 0) {
                        roomParticipants.delete(roomId);
                    }
                }
                socket.leave(roomId);
                socketUserMap.delete(socket.id);
                console.log(`[SIGNAL] webrtc:leave roomId=${roomId} socket=${socket.id}. Remaining peers: ${peers?.size || 0}`);
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

            // Friend Request Events
            socket.on("friend:request-sent", (data: { to: string }) => {
                const targetSocketId = onlineUsers.get(data.to);
                if (targetSocketId) {
                    io.to(targetSocketId).emit("friend:request-received");
                    io.to(targetSocketId).emit("friend:update"); // Generic update trigger
                }
            });

            socket.on("friend:respond", (data: { to: string, action: string }) => {
                const targetSocketId = onlineUsers.get(data.to);
                if (targetSocketId) {
                    io.to(targetSocketId).emit("friend:update"); // Refresh lists
                }
            });

            socket.on("disconnect", () => {
                console.log("SERVER: Socket Disconnected:", socket.id);
                // Clean up WebRTC rooms
                for (const [roomId, peers] of roomParticipants.entries()) {
                    if (peers.has(socket.id)) {
                        peers.delete(socket.id);
                        socket.to(roomId).emit("webrtc:peer-left", { socketId: socket.id });
                        if (peers.size === 0) {
                            roomParticipants.delete(roomId);
                        }
                    }
                }
                // Find and remove the user who disconnected
                for (const [userId, socketId] of onlineUsers.entries()) {
                    if (socketId === socket.id) {
                        onlineUsers.delete(userId);
                        io.emit("user:offline", userId);
                        console.log(`SERVER: User disconnected: ${userId}`);
                        break;
                    }
                }
                socketUserMap.delete(socket.id);
            });
        });

        res.socket.server.io = io;
    } else {
        console.log("SERVER: Socket.io already running");
    }

    res.end();
};

export default ioHandler;
