import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { TypingStatus } from "@/models/TypingStatus";
import { Conversation } from "@/models/Conversation";

const RECENT_WINDOW_MS = 5000; // typing considered active within this window

export const dynamic = "force-dynamic";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ conversationId: string }> }
) {
    try {
        const { conversationId } = await params;
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Verify user is part of conversation
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
        }

        const cutoff = new Date(Date.now() - RECENT_WINDOW_MS);
        const typingUsers = await TypingStatus.find({
            conversationId: conversationId,
            userId: { $ne: session.user.id },
            updatedAt: { $gte: cutoff }
        }).populate('userId', 'name username image').exec();

        return NextResponse.json({
            typing: typingUsers.length > 0,
            typingUsers: typingUsers
        }, { status: 200 });
    } catch (error) {
        console.error("GET_TYPING_ERROR", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

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

        const { isTyping } = await req.json();

        // Verify user is part of conversation
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
        }

        if (isTyping) {
            await TypingStatus.findOneAndUpdate(
                { conversationId, userId: session.user.id },
                { 
                    conversationId,
                    userId: session.user.id,
                    updatedAt: new Date()
                },
                { upsert: true, new: true }
            );
        } else {
            await TypingStatus.deleteOne({ conversationId, userId: session.user.id });
        }

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        console.error("POST_TYPING_ERROR", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
