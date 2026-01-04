import { NextResponse } from "next/server";
import { DirectMessage } from "@/models/DirectMessage";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import mongoose from "mongoose";

export async function POST(
    req: Request,
    { params }: { params: Promise<{ conversationId: string }> }
) {
    try {
        const { conversationId } = await params;
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { messageIds } = await req.json();
        if (!messageIds || !Array.isArray(messageIds)) {
            return NextResponse.json({ error: "Invalid message IDs" }, { status: 400 });
        }

        const userId = new mongoose.Types.ObjectId(session.user.id);

        // Mark messages as read
        const result = await DirectMessage.updateMany(
            {
                _id: { $in: messageIds.map(id => new mongoose.Types.ObjectId(id)) },
                conversationId: conversationId,
                "readBy.userId": { $ne: userId }
            },
            {
                $push: {
                    readBy: {
                        userId: userId,
                        readAt: new Date(),
                    }
                }
            }
        );

        return NextResponse.json(
            { 
                success: true, 
                modifiedCount: result.modifiedCount 
            }, 
            { status: 200 }
        );
    } catch (error) {
        console.error("MARK_READ_ERROR", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
