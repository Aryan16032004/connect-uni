import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import User from "@/models/User";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const query = searchParams.get("q");

        if (!query || query.length < 2) {
            return NextResponse.json([]);
        }

        await dbConnect();

        // Search Users (excluding self)
        const users = await User.find({
            _id: { $ne: session.user.id },
            $or: [
                { username: { $regex: query, $options: "i" } },
                { name: { $regex: query, $options: "i" } },
                { email: { $regex: query, $options: "i" } }
            ]
        }).select("name username email image bio status followers following createdAt _id").limit(20);

        // Fetch current user to check friendship status
        const currentUser = await User.findById(session.user.id).select('friends friendRequests');

        const results = users.map((user: any) => {
            let status = 'none'; // 'none', 'friend', 'sent', 'received'

            if (currentUser?.friends?.includes(user._id)) {
                status = 'friend';
            } else if (currentUser?.friendRequests) {
                const req = currentUser.friendRequests.find((r: any) => r?.user?.toString() === user._id.toString());
                if (req) {
                    status = req.type;
                }
            }

            return {
                ...user.toObject(),
                friendshipStatus: status
            };
        });

        return NextResponse.json(results);

    } catch (error) {
        console.error("USER_SEARCH_GET", error);
        return NextResponse.json({ message: "Internal Error" }, { status: 500 });
    }
}
