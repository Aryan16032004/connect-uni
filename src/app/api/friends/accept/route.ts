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

        const currentUser = await User.findById(session.user.id);
        const sender = await User.findById(senderId);

        if (!sender) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Verify the request exists
        const request = currentUser.friendRequests?.find(
            (req: any) => req.user.toString() === senderId && req.type === 'received'
        );

        if (!request) {
            return NextResponse.json({ error: "Friend request not found" }, { status: 404 });
        }

        // Add to friends list for both users
        await User.findByIdAndUpdate(session.user.id, {
            $push: { friends: senderId },
            $pull: { friendRequests: { user: senderId } }
        });

        await User.findByIdAndUpdate(senderId, {
            $push: { friends: session.user.id },
            $pull: { friendRequests: { user: session.user.id } }
        });

        return NextResponse.json({ message: "Friend request accepted" });

    } catch (error) {
        console.error("FRIEND_ACCEPT_POST", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
