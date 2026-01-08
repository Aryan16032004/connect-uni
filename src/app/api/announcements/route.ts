import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import { Announcement } from "@/models/Announcement";

export async function GET(req: Request) {
    try {
        await dbConnect();

        const { searchParams } = new URL(req.url);
        const sort = searchParams.get('sort') || 'new';
        const limit = parseInt(searchParams.get('limit') || '20');

        let sortQuery: any = { createdAt: -1 };
        
        if (sort === 'top') {
            // Sort by net votes (upvotes - downvotes)
            sortQuery = {};
        }

        let announcements = await Announcement.find()
            .populate('authorId', 'name username image avatar')
            .sort(sortQuery)
            .limit(limit);

        // Calculate net votes if sorting by top
        if (sort === 'top') {
            announcements = announcements.map(a => ({
                ...a.toObject(),
                netVotes: a.upvotes.length - a.downvotes.length
            })).sort((a: any, b: any) => b.netVotes - a.netVotes);
        } else {
            announcements = announcements.map(a => ({
                ...a.toObject(),
                netVotes: a.upvotes.length - a.downvotes.length
            }));
        }

        return NextResponse.json(announcements);
    } catch (error) {
        console.error("Get announcements error:", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { title, content } = await req.json();

        if (!title || !content) {
            return NextResponse.json({ error: "Title and content required" }, { status: 400 });
        }

        await dbConnect();

        const announcement = await Announcement.create({
            title,
            content,
            authorId: session.user.id,
        });

        const populated = await Announcement.findById(announcement._id)
            .populate('authorId', 'name username image avatar');

        return NextResponse.json(populated, { status: 201 });
    } catch (error) {
        console.error("Create announcement error:", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
