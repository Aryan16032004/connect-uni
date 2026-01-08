import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import User from "@/models/User";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { senderId } = await req.json();

        if (!senderId) {
            return NextResponse.json({ error: "Sender ID required" }, { status: 400 });
        }

        await dbConnect();

        // Remove request from both users
        await User.findByIdAndUpdate(session.user.id, {
            $pull: { friendRequests: { user: senderId } }
        });

        await User.findByIdAndUpdate(senderId, {
            $pull: { friendRequests: { user: session.user.id } }
        });

        return NextResponse.json({ message: "Friend request rejected" });

    } catch (error) {
        console.error("FRIEND_REJECT_POST", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
