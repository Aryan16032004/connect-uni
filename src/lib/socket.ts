import { Server as ServerIO } from "socket.io";

let io: ServerIO | null = null;
let onlineUsers: Map<string, string> = new Map();

export function setIoInstance(instance: ServerIO) {
    io = instance;
}

export function getIoInstance(): ServerIO | null {
    return io;
}

export function setOnlineUsers(users: Map<string, string>) {
    onlineUsers = users;
}

export function getOnlineUsers(): Map<string, string> {
    return onlineUsers;
}
