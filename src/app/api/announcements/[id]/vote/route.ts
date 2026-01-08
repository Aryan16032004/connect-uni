import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import { Announcement } from "@/models/Announcement";

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const { action } = await req.json(); // 'upvote' or 'downvote'

        await dbConnect();

        const announcement = await Announcement.findById(id);
        if (!announcement) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        const userId = session.user.id;
        const hasUpvoted = announcement.upvotes.includes(userId);
        const hasDownvoted = announcement.downvotes.includes(userId);

        if (action === 'upvote') {
            if (hasUpvoted) {
                // Remove upvote
                announcement.upvotes = announcement.upvotes.filter((id: any) => id.toString() !== userId);
            } else {
                // Add upvote and remove downvote if exists
                announcement.upvotes.push(userId);
                announcement.downvotes = announcement.downvotes.filter((id: any) => id.toString() !== userId);
            }
        } else if (action === 'downvote') {
            if (hasDownvoted) {
                // Remove downvote
                announcement.downvotes = announcement.downvotes.filter((id: any) => id.toString() !== userId);
            } else {
                // Add downvote and remove upvote if exists
                announcement.downvotes.push(userId);
                announcement.upvotes = announcement.upvotes.filter((id: any) => id.toString() !== userId);
            }
        }

        await announcement.save();

        return NextResponse.json({
            upvotes: announcement.upvotes.length,
            downvotes: announcement.downvotes.length,
            userVote: announcement.upvotes.includes(userId) ? 'upvote' : announcement.downvotes.includes(userId) ? 'downvote' : null
        });
    } catch (error) {
        console.error("Vote error:", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
