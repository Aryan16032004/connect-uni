import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import { ServerMembers } from "@/models/ServerMembers";
import { Server } from "@/models/Server";

export async function GET(req: Request, props: { params: Promise<{ serverId: string }> }) {
    const params = await props.params;
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const { serverId } = params;
        await dbConnect();

        // Check availability
        const server = await Server.findById(serverId);
        if (!server) return NextResponse.json({ message: "Not found" }, { status: 404 });

        // Check if requester is a member (or public server?)
        // For settings usually only members can see member list, or maybe public too.
        // Let's ensure membership for now.
        const requester = await ServerMembers.findOne({ serverId, userId: session.user.id });
        if (!requester && server.visibility === 'private') {
            return NextResponse.json({ message: "Access Denied" }, { status: 403 });
        }

        const members = await ServerMembers.find({ serverId })
            .populate("userId", "name username image")
            .populate("roles"); // If we have role structure

        return NextResponse.json(members);

    } catch (error) {
        console.error("SERVER_MEMBERS_GET", error);
        return NextResponse.json({ message: "Internal Error" }, { status: 500 });
    }
}
