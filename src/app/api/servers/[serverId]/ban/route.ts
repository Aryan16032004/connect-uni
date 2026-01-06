import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import { ServerMembers } from "@/models/ServerMembers";
import { ServerBan } from "@/models/ServerBan";
import { Server } from "@/models/Server";

export async function POST(req: Request, props: { params: Promise<{ serverId: string }> }) {
    const params = await props.params;
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

        const { serverId } = params;
        const { userId, reason } = await req.json();

        if (!userId) return NextResponse.json({ message: "User ID required" }, { status: 400 });

        await dbConnect();

        // Check requester permissions (Owner or Admin)
        const requester = await ServerMembers.findOne({ serverId, userId: session.user.id }).populate("roles");
        const server = await Server.findById(serverId);

        if (!requester || !server) return NextResponse.json({ message: "Not found" }, { status: 404 });

        const isAdmin = requester.roles.some((r: any) => r.name === 'Admin');
        const isOwner = server.ownerId.toString() === session.user.id;

        if (!isAdmin && !isOwner) {
            return NextResponse.json({ message: "Missing Permissions" }, { status: 403 });
        }

        // Prevent banning self or owner
        if (userId === session.user.id || userId === server.ownerId.toString()) {
            return NextResponse.json({ message: "Cannot ban this user" }, { status: 400 });
        }

        // Create Ban Record
        await ServerBan.create({
            serverId,
            userId,
            bannedById: session.user.id,
            reason
        });

        // Remove from members
        await ServerMembers.findOneAndDelete({ serverId, userId });

        return NextResponse.json({ message: "User banned" });

    } catch (error) {
        console.error("SERVER_BAN_POST", error);
        return NextResponse.json({ message: "Internal Error" }, { status: 500 });
    }
}
