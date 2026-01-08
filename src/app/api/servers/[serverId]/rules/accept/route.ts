import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/db";
import { ServerMembers } from "@/models/ServerMembers";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ serverId: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { serverId } = await params;

        await connectDB();

        // Find the member document for this user in this server
        const member = await ServerMembers.findOne({
            serverId,
            userId: session.user.id,
        });

        if (!member) {
            return NextResponse.json(
                { error: "You are not a member of this server" },
                { status: 404 }
            );
        }

        // Update the rulesAccepted field
        member.rulesAccepted = true;
        await member.save();

        return NextResponse.json({ success: true, member });
    } catch (error) {
        console.error("Error accepting rules:", error);
        return NextResponse.json(
            { error: "Failed to accept rules" },
            { status: 500 }
        );
    }
}
