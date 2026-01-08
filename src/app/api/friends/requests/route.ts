import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import User from "@/models/User";

// Get all friend requests
export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await dbConnect();

        const user = await User.findById(session.user.id).populate({
            path: 'friendRequests.user',
            select: 'name username email image bio'
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Separate received and sent requests
        const received = user.friendRequests?.filter((req: any) => req.type === 'received') || [];
        const sent = user.friendRequests?.filter((req: any) => req.type === 'sent') || [];

        return NextResponse.json({
            received,
            sent
        });

    } catch (error) {
        console.error("FRIEND_REQUESTS_GET", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
