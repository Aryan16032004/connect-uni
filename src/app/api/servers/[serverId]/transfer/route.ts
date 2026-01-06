import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import { ServerMembers } from "@/models/ServerMembers";
import { Server } from "@/models/Server";

export async function POST(req: Request, props: { params: Promise<{ serverId: string }> }) {
    const params = await props.params;
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

        const { serverId } = params;
        const { newOwnerId } = await req.json();

        if (!newOwnerId) return NextResponse.json({ message: "New Owner ID required" }, { status: 400 });

        await dbConnect();

        const server = await Server.findById(serverId);
        if (!server) return NextResponse.json({ message: "Server not found" }, { status: 404 });

        // Only current owner can transfer
        if (server.ownerId.toString() !== session.user.id) {
            return NextResponse.json({ message: "Only owner can transfer ownership" }, { status: 403 });
        }

        // Check if new owner is a member
        const newOwnerMember = await ServerMembers.findOne({ serverId, userId: newOwnerId });
        if (!newOwnerMember) {
            return NextResponse.json({ message: "New owner must be a member" }, { status: 400 });
        }

        // Update Server Owner
        server.ownerId = newOwnerId;
        await server.save();

        // Ideally, we should also update roles (give new owner Admin/Owner role, remove from old)
        // For now, implicit ownership via server.ownerId is sufficient for our logic.
        // But let's ensure the new owner has Admin role if roles exist?
        // Let's keep it simple: just update ownerId.

        return NextResponse.json({ message: "Ownership transferred" });

    } catch (error) {
        console.error("SERVER_TRANSFER_POST", error);
        return NextResponse.json({ message: "Internal Error" }, { status: 500 });
    }
}
