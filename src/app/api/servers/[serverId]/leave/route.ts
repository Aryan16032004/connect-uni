import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import { ServerMembers } from "@/models/ServerMembers";
import { Server } from "@/models/Server";

export async function DELETE(req: Request, props: { params: Promise<{ serverId: string }> }) {
    const params = await props.params;
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

        const { serverId } = params;
        await dbConnect();

        const server = await Server.findById(serverId);
        if (!server) return NextResponse.json({ message: "Server not found" }, { status: 404 });

        // Prevent owner from leaving (must transfer first or delete server)
        if (server.ownerId.toString() === session.user.id) {
            return NextResponse.json({ message: "Owner cannot leave server. Transfer ownership or delete server." }, { status: 400 });
        }

        // Delete membership
        await ServerMembers.findOneAndDelete({ serverId, userId: session.user.id });

        return NextResponse.json({ message: "Left server" });

    } catch (error) {
        console.error("SERVER_LEAVE_DELETE", error);
        return NextResponse.json({ message: "Internal Error" }, { status: 500 });
    }
}
