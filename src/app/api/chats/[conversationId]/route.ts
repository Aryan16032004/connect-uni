import { NextResponse } from "next/server";
import { Conversation } from "@/models/Conversation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

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

        const conversation = await Conversation.findById(conversationId)
            .populate('memberOneId', 'name image username status')
            .populate('memberTwoId', 'name image username status')
            .populate('members', 'name image username status')
            .exec();

        if (!conversation) {
            return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
        }

        return NextResponse.json(conversation, { status: 200 });
    } catch (error) {
        console.error("GET_CONVERSATION_ERROR", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
