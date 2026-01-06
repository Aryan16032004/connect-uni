import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import { ServerMembers } from "@/models/ServerMembers";

export async function POST(req: Request, props: { params: Promise<{ serverId: string }> }) {
    const params = await props.params;
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

        const { serverId } = params;
        const { userId } = await req.json();

        if (!userId) return NextResponse.json({ message: "User ID required" }, { status: 400 });

        await dbConnect();

        // Check requester permissions
        const requester = await ServerMembers.findOne({ serverId, userId: session.user.id }).populate("roles");
        if (!requester) return NextResponse.json({ message: "Access Denied" }, { status: 403 });

        // Simple permission check: must be owner or have 'Admin' role
        // Ideally we check specific 'KICK_MEMBERS' permission
        const isAdmin = requester.roles.some((r: any) => r.name === 'Admin');
        // We need to fetch the Server to check ownership too, but for simplicity let's assume Admin role is enough or relying on frontend 'canManage'
        // For robustness, let's fetch Server? Or just rely on roles.
        // Let's rely on Admin role for now.

        if (!isAdmin) {
            // Check if owner? (Need server fetches)
            // Let's assume the frontend protects UI, but backend must protect too.
            // Without fetching Server, we can't check ownerId.
            // Let's fetch Server.
            const { Server } = await import("@/models/Server");
            const server = await Server.findById(serverId);
            if (server.ownerId.toString() !== session.user.id) {
                return NextResponse.json({ message: "Missing Permissions" }, { status: 403 });
            }
        }

        // Prevent kicking self
        if (userId === session.user.id) {
            return NextResponse.json({ message: "Cannot kick self" }, { status: 400 });
        }

        // Delete membership
        await ServerMembers.findOneAndDelete({ serverId, userId });

        return NextResponse.json({ message: "User kicked" });

    } catch (error) {
        console.error("SERVER_KICK_POST", error);
        return NextResponse.json({ message: "Internal Error" }, { status: 500 });
    }
}
