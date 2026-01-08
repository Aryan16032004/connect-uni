import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import { ServerMembers as ServerMember } from "@/models/ServerMembers";
import { Server } from "@/models/Server";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const { serverId } = await req.json();

        if (!serverId) {
            return NextResponse.json({ message: "Server ID required" }, { status: 400 });
        }

        await dbConnect();

        // Check if server exists
        const server = await Server.findById(serverId);
        if (!server) return NextResponse.json({ message: "Server not found" }, { status: 404 });

        // Check if banned
        const { ServerBan } = await import("@/models/ServerBan");
        const banned = await ServerBan.findOne({ serverId, userId: session.user.id });
        if (banned) {
            return NextResponse.json({ message: "You are banned from this server" }, { status: 403 });
        }

        // Check if already a member
        const existing = await ServerMember.findOne({ userId: session.user.id, serverId });
        if (existing) {
            return NextResponse.json({ message: "Already a member", serverId }, { status: 200 });
        }

        // Create Membership
        await ServerMember.create({
            userId: session.user.id,
            serverId,
            role: "guest"
        });

        // Emit socket event to notify server members
        try {
            const { getIoInstance } = await import('@/lib/socket');
            const io = getIoInstance();
            if (io) {
                io.emit('member:joined', { serverId, userId: session.user.id });
            }
        } catch (e) {
            console.log('Socket notification error:', e);
        }

        return NextResponse.json({ success: true, serverId }, { status: 201 });

    } catch (error) {
        console.error("SERVER_JOIN_POST", error);
        return NextResponse.json({ message: "Internal Error" }, { status: 500 });
    }
}
