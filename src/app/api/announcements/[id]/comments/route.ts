import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import { AnnouncementComment } from "@/models/AnnouncementComment";
import { Announcement } from "@/models/Announcement";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await dbConnect();
        const { id } = await params;

        const comments = await AnnouncementComment.find({ announcementId: id, parentCommentId: null })
            .populate('authorId', 'name username image avatar')
            .sort({ createdAt: -1 });

        // Get replies for each comment
        const commentsWithReplies = await Promise.all(
            comments.map(async (comment) => {
                const replies = await AnnouncementComment.find({ parentCommentId: comment._id })
                    .populate('authorId', 'name username image avatar')
                    .sort({ createdAt: 1 });
                
                return {
                    ...comment.toObject(),
                    replies: replies.map(r => ({
                        ...r.toObject(),
                        netVotes: r.upvotes.length - r.downvotes.length
                    })),
                    netVotes: comment.upvotes.length - comment.downvotes.length
                };
            })
        );

        return NextResponse.json(commentsWithReplies);
    } catch (error) {
        console.error("Get comments error:", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}

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
        const { content, parentCommentId, commentId, action } = await req.json();

        await dbConnect();

        // Handle comment voting
        if (commentId && action) {
            const comment = await AnnouncementComment.findById(commentId);
            if (!comment) {
                return NextResponse.json({ error: "Comment not found" }, { status: 404 });
            }

            const userId = session.user.id;

            if (action === "upvote") {
                const hasUpvoted = comment.upvotes.includes(userId);
                const hasDownvoted = comment.downvotes.includes(userId);

                if (hasUpvoted) {
                    comment.upvotes = comment.upvotes.filter((id: string) => id !== userId);
                } else {
                    if (hasDownvoted) {
                        comment.downvotes = comment.downvotes.filter((id: string) => id !== userId);
                    }
                    comment.upvotes.push(userId);
                }
            } else if (action === "downvote") {
                const hasUpvoted = comment.upvotes.includes(userId);
                const hasDownvoted = comment.downvotes.includes(userId);

                if (hasDownvoted) {
                    comment.downvotes = comment.downvotes.filter((id: string) => id !== userId);
                } else {
                    if (hasUpvoted) {
                        comment.upvotes = comment.upvotes.filter((id: string) => id !== userId);
                    }
                    comment.downvotes.push(userId);
                }
            }

            await comment.save();
            return NextResponse.json({ success: true });
        }

        // Handle comment creation
        if (!content) {
            return NextResponse.json({ error: "Content required" }, { status: 400 });
        }

        const comment = await AnnouncementComment.create({
            announcementId: id,
            authorId: session.user.id,
            content,
            parentCommentId: parentCommentId || null,
        });

        // Update comment count
        await Announcement.findByIdAndUpdate(id, { $inc: { commentCount: 1 } });

        const populated = await AnnouncementComment.findById(comment._id)
            .populate('authorId', 'name username image avatar');

        return NextResponse.json(populated, { status: 201 });
    } catch (error) {
        console.error("Create comment error:", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
