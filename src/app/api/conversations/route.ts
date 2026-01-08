import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import { Conversation } from "@/models/Conversation";
import User from "@/models/User"; // Ensure User model matches your project

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user?.id) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const { remoteUserId } = await req.json();
        if (!remoteUserId) return NextResponse.json({ message: "Remote User ID required" }, { status: 400 });

        await dbConnect();

        // Check if users are friends before allowing chat
        const currentUser = await User.findById(session.user.id).select('friends');
        if (!currentUser?.friends?.includes(remoteUserId)) {
            return NextResponse.json({ error: "You can only message friends" }, { status: 403 });
        }

        // Ensure consistent ordering to prevent duplicate conversations (A-B vs B-A)
        // Actually, let's just query for both combinations OR enforce order. 
        // Enforcing order is cleaner for unique index.
        const memberOneId = session.user.id < remoteUserId ? session.user.id : remoteUserId;
        const memberTwoId = session.user.id < remoteUserId ? remoteUserId : session.user.id;

        // Find existing
        let conversation = await Conversation.findOne({
            memberOneId,
            memberTwoId
        }).populate("memberOneId memberTwoId");

        if (!conversation) {
            // Create new
            conversation = await Conversation.create({
                memberOneId,
                memberTwoId
            });
            // Populate immediately for return
            conversation = await Conversation.findById(conversation._id).populate("memberOneId memberTwoId");
        }

        return NextResponse.json(conversation, { status: 200 });

    } catch (error) {
        console.error("Conversation Create Error:", error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user?.id) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        await dbConnect();

        // Find all conversations where user is either memberOne or memberTwo
        const conversations = await Conversation.find({
            $or: [
                { memberOneId: session.user.id },
                { memberTwoId: session.user.id }
            ]
        })
        .populate("memberOneId memberTwoId")
        .sort({ lastMessageAt: -1 });

        return NextResponse.json(conversations, { status: 200 });

    } catch (error) {
        console.error("Conversation List Error:", error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}
