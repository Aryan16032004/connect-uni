import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { Server } from "@/models/Server";
import Event from "@/models/Event";
import Product from "@/models/Product";
import { Announcement } from "@/models/Announcement";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await dbConnect();

        const user = await User.findById(session.user.id);
        if (user.role !== 'superadmin') {
            return NextResponse.json({ error: "Access denied. Super admin only." }, { status: 403 });
        }

        // Get all stats
        const totalUsers = await User.countDocuments();
        const totalServers = await Server.countDocuments();
        const totalEvents = await Event.countDocuments();
        const totalProducts = await Product.countDocuments();
        const totalAnnouncements = await Announcement.countDocuments();

        const recentUsers = await User.find()
            .select('name email role createdAt')
            .sort({ createdAt: -1 })
            .limit(10);

        const recentEvents = await Event.find()
            .populate('organizerId', 'name email')
            .sort({ createdAt: -1 })
            .limit(5);

        const recentProducts = await Product.find()
            .populate('sellerId', 'name email')
            .sort({ createdAt: -1 })
            .limit(5);

        const recentAnnouncements = await Announcement.find()
            .populate('authorId', 'name email')
            .sort({ createdAt: -1 })
            .limit(5);

        const recentServers = await Server.find()
            .populate('ownerId', 'name email')
            .sort({ createdAt: -1 })
            .limit(5);

        return NextResponse.json({
            stats: {
                totalUsers,
                totalServers,
                totalEvents,
                totalProducts,
                totalAnnouncements,
            },
            recentUsers,
            recentEvents,
            recentProducts,
            recentAnnouncements,
            recentServers,
        });
    } catch (error) {
        console.error("Super admin dashboard error:", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
