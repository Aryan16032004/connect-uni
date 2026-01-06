import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import ActiveLocation from "@/models/ActiveLocation";
import User from "@/models/User";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user?.email) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const { lat, lng } = await req.json();

        if (typeof lat !== 'number' || typeof lng !== 'number') {
            return NextResponse.json({ message: "Invalid coordinates" }, { status: 400 });
        }

        await dbConnect();

        // Find user ID (session might not have id directly if not customised, safely get it)
        const user = await User.findOne({ email: session.user.email }).select('_id');
        if (!user) {
            return NextResponse.json({ message: "User not found" }, { status: 404 });
        }

        // Upsert active location
        await ActiveLocation.findOneAndUpdate(
            { userId: user._id },
            {
                location: { type: 'Point', coordinates: [lng, lat] },
                lastActive: new Date()
            },
            { upsert: true, new: true }
        );

        return NextResponse.json({ success: true }, { status: 200 });

    } catch (error) {
        console.error("Location heartbeat error:", error);
        return NextResponse.json({ message: "Internal Error" }, { status: 500 });
    }
}
export async function DELETE(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user?.email) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        await dbConnect();
        const user = await User.findOne({ email: session.user.email }).select('_id');

        if (user) {
            await ActiveLocation.findOneAndDelete({ userId: user._id });
        }

        return NextResponse.json({ success: true }, { status: 200 });

    } catch (error) {
        console.error("Location cleanup error:", error);
        return NextResponse.json({ message: "Internal Error" }, { status: 500 });
    }
}
