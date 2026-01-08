import { Server as NetServer } from "http";
import { NextApiRequest } from "next";
import { Server as ServerIO } from "socket.io";
import { NextApiResponse } from "next";

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
        console.log("SERVER: Initializing Socket.io");
        const path = "/api/socket/io";
        const httpServer: NetServer = res.socket.server as any;

        const io = new ServerIO(httpServer, {
            path: path,
            addTrailingSlash: false,
            cors: {
                origin: "*",
                methods: ["GET", "POST"],
            },
            transports: ["websocket", "polling"],
            allowEIO3: true,
        });

        // Track online users
        const onlineUsers = new Map<string, string>();

        io.on("connection", (socket) => {
            console.log("[SOCKET] Connected:", socket.id);

            socket.on("register-user", (userId: string) => {
                onlineUsers.set(userId, socket.id);
                socketUserMap.set(socket.id, userId);
                io.emit("user:online", userId);
                const onlineUserIds = Array.from(onlineUsers.keys());
                socket.emit("users:online", onlineUserIds);
                console.log(`[USER] Registered: ${userId}`);
            });

            socket.on("join-room", (roomId: string) => {
                socket.join(roomId);
                console.log("[ROOM] Joined:", { socketId: socket.id, roomId });
            });

            socket.on("webrtc:join", ({ roomId, userId }: { roomId: string; userId?: string }) => {
                console.log("[WEBRTC] Join:", { socketId: socket.id, roomId, userId });

                socket.join(roomId);
                if (userId) socketUserMap.set(socket.id, userId);

                const participants = roomParticipants.get(roomId) || new Set<string>();
                const existingPeers = Array.from(participants).filter((id) => id !== socket.id);

                participants.add(socket.id);
                roomParticipants.set(roomId, participants);

                // Send list of existing peers to the new joiner
                socket.emit("webrtc:peers", { peers: existingPeers });

                // Notify existing peers about the new joiner
                socket.to(roomId).emit("webrtc:peer-joined", { peerId: socket.id, userId });

                console.log("[WEBRTC] Room:", roomId, "- Peers:", participants.size);
            });

            socket.on("webrtc:signal", ({ to, offer, answer, candidate }: any) => {
                console.log("[WEBRTC] Signal:", { from: socket.id, to, hasOffer: !!offer, hasAnswer: !!answer, hasCandidate: !!candidate });

                io.to(to).emit("webrtc:signal", {
                    from: socket.id,
                    offer,
                    answer,
                    candidate,
                });
            });

            socket.on("webrtc:leave", ({ roomId }: { roomId: string }) => {
                console.log("[WEBRTC] Leave:", { socketId: socket.id, roomId });

                const participants = roomParticipants.get(roomId);
                if (participants) {
                    participants.delete(socket.id);
                    socket.to(roomId).emit("webrtc:peer-left", { peerId: socket.id });

                    if (participants.size === 0) {
                        roomParticipants.delete(roomId);
                    }
                }

                socket.leave(roomId);
                socketUserMap.delete(socket.id);
            });

            socket.on("send-message", (message: any) => {
                const room = message.channelId || message.conversationId || message.room;
                console.log(`[MESSAGE] Room: ${room}`);
                if (room) {
                    io.to(room).emit("new-message", message);
                }
            });

            socket.on("typing", (data: any) => {
                const room = data.room || data.channelId || data.conversationId;
                if (room) {
                    socket.to(room).emit("typing", data);
                }
            });

            socket.on("friend:request-sent", (data: { to: string }) => {
                const targetSocketId = onlineUsers.get(data.to);
                if (targetSocketId) {
                    io.to(targetSocketId).emit("friend:request-received");
                    io.to(targetSocketId).emit("friend:update");
                }
            });

            socket.on("friend:respond", (data: { to: string; action: string }) => {
                const targetSocketId = onlineUsers.get(data.to);
                if (targetSocketId) {
                    io.to(targetSocketId).emit("friend:update");
                }
            });

            socket.on("disconnect", () => {
                console.log("[SOCKET] Disconnected:", socket.id);

                // Clean up WebRTC rooms
                for (const [roomId, peers] of roomParticipants.entries()) {
                    if (peers.has(socket.id)) {
                        peers.delete(socket.id);
                        socket.to(roomId).emit("webrtc:peer-left", { peerId: socket.id });
                        if (peers.size === 0) {
                            roomParticipants.delete(roomId);
                        }
                    }
                }

                // Clean up user
                for (const [userId, socketId] of onlineUsers.entries()) {
                    if (socketId === socket.id) {
                        onlineUsers.delete(userId);
                        io.emit("user:offline", userId);
                        console.log(`[USER] Disconnected: ${userId}`);
                        break;
                    }
                }

                socketUserMap.delete(socket.id);
            });
        });

        res.socket.server.io = io;
        console.log("SERVER: Socket.io initialized successfully");
    } else {
        console.log("SERVER: Socket.io already running");
    }

    res.end();
};

export default ioHandler;
