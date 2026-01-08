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

        // Check if target user is a member
        const targetMember = await ServerMembers.findOne({ serverId, userId });
        if (!targetMember) {
            return NextResponse.json({ message: "User is not a member" }, { status: 404 });
        }

        // Prevent kicking the owner
        const { Server } = await import("@/models/Server");
        const server = await Server.findById(serverId);
        if (server.ownerId.toString() === userId) {
            return NextResponse.json({ message: "Cannot kick server owner" }, { status: 400 });
        }

        // Delete membership (kicked users CAN rejoin)
        await ServerMembers.findOneAndDelete({ serverId, userId });

        // Emit socket event to notify the kicked user
        try {
            const { getIoInstance, getOnlineUsers } = await import('@/lib/socket');
            const io = getIoInstance();
            const onlineUsers = getOnlineUsers();
            
            if (io) {
                // Notify the kicked user
                if (onlineUsers) {
                    const targetSocketId = onlineUsers.get(userId);
                    if (targetSocketId) {
                        io.to(targetSocketId).emit('user:kicked', { 
                            userId, 
                            serverId,
                            serverName: server.name 
                        });
                        console.log(`Kick notification sent to user ${userId}`);
                    }
                }
                
                // Notify all server members about the kick (for member list updates)
                io.emit('member:kicked', { serverId, userId });
            }
        } catch (e) {
            console.log('Socket notification error:', e);
        }

        return NextResponse.json({ message: "User kicked successfully", success: true });

    } catch (error) {
        console.error("SERVER_KICK_POST", error);
        return NextResponse.json({ message: "Internal Error" }, { status: 500 });
    }
}
