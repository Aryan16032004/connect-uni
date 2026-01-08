import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import { Announcement } from "@/models/Announcement";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await dbConnect();
        const { id } = await params;

        const announcement = await Announcement.findById(id)
            .populate('authorId', 'name username image avatar');

        if (!announcement) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        const netVotes = announcement.upvotes.length - announcement.downvotes.length;

        return NextResponse.json({
            ...announcement.toObject(),
            netVotes
        });
    } catch (error) {
        console.error("Get announcement error:", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await dbConnect();
        const { id } = await params;

        const announcement = await Announcement.findById(id);
        if (!announcement) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        // Only author or superadmin can delete
        const User = (await import('@/models/User')).default;
        const user = await User.findById(session.user.id);

        if (announcement.authorId.toString() !== session.user.id && user.role !== 'superadmin') {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await Announcement.findByIdAndDelete(id);

        // Delete associated comments
        const { AnnouncementComment } = await import('@/models/AnnouncementComment');
        await AnnouncementComment.deleteMany({ announcementId: id });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Delete announcement error:", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
