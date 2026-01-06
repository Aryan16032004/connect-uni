import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import { ServerMembers } from "@/models/ServerMembers";

export async function GET(req: Request, props: { params: Promise<{ serverId: string }> }) {
    const params = await props.params;

    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const { serverId } = params;
        await dbConnect();

        // Check if user is a member of the server (or if server is public, maybe?)
        // Ideally, we should check view permissions. Assuming membership is enough.
        const membership = await ServerMembers.findOne({ serverId, userId: session.user.id });
        if (!membership) {
            return NextResponse.json({ message: "Access Denied" }, { status: 403 });
        }

        // Fetch all members with user details
        const members = await ServerMembers.find({ serverId })
            .populate("userId", "name email image username")
            .populate("roles", "name color permissions");

        // Filter out members whose user account has been deleted (userId is null)
        const validMembers = members.filter((member: any) => member.userId);

        return NextResponse.json(validMembers);

    } catch (error) {
        console.error("SERVER_MEMBERS_GET", error);
        return NextResponse.json({ message: "Internal Error" }, { status: 500 });
    }
}
