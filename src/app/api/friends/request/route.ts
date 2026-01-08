import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import User from "@/models/User";

// Send friend request
export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { receiverId } = await req.json();

        if (!receiverId) {
            return NextResponse.json({ error: "Receiver ID required" }, { status: 400 });
        }

        if (receiverId === session.user.id) {
            return NextResponse.json({ error: "Cannot send friend request to yourself" }, { status: 400 });
        }

        await dbConnect();

        // Fix corrupted friendRequests fields in database (convert objects to arrays)
        await User.updateMany(
            { friendRequests: { $not: { $type: "array" } } },
            { $set: { friendRequests: [] } }
        );

        const sender = await User.findById(session.user.id);
        const receiver = await User.findById(receiverId);

        if (!receiver) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Check if already friends
        if (sender.friends?.includes(receiverId)) {
            return NextResponse.json({ error: "Already friends" }, { status: 400 });
        }

            // Check if request already exists (sent or received)
        // Check if request already exists
        const existingRequest = sender.friendRequests?.find(
            (req: any) => req?.user?.toString() === receiverId && req.type === 'sent'
        );

        if (existingRequest) {
            return NextResponse.json({ error: "Friend request already sent" }, { status: 400 });
        }

        // Check if they already have a pending request from receiver
        const reverseRequest = sender.friendRequests?.find(
            (req: any) => req?.user?.toString() === receiverId && req.type === 'received'
        );

        if (reverseRequest) {
            return NextResponse.json({ error: "This user has already sent you a request" }, { status: 400 });
        }

        // Add to sender's sent requests
        await User.findByIdAndUpdate(session.user.id, {
            $push: {
                friendRequests: {
                    user: receiverId,
                    type: 'sent',
                    createdAt: new Date()
                }
            }
        });

        // Add to receiver's received requests
        await User.findByIdAndUpdate(receiverId, {
            $push: {
                friendRequests: {
                    user: session.user.id,
                    type: 'received',
                    createdAt: new Date()
                }
            }
        });

        return NextResponse.json({ message: "Friend request sent successfully" });

    } catch (error) {
        console.error("FRIEND_REQUEST_POST", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
