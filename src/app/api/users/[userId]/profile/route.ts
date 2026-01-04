import { NextResponse } from "next/server";
import User from "@/models/User";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import mongoose from "mongoose";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ userId: string }> }
) {
    try {
        const { userId } = await params;
        const session = await getServerSession(authOptions);

        const user = await User.findById(userId)
            .select('-password -blockedUsers')
            .populate('followers', 'name username image')
            .populate('following', 'name username image')
            .exec();

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // If viewing own profile, return full profile
        if (session?.user?.id === userId) {
            return NextResponse.json(user, { status: 200 });
        }

        // If viewing another user's profile, check follow relationship
        const currentUserObjectId = new mongoose.Types.ObjectId(session?.user?.id || '');
        const userObjectId = new mongoose.Types.ObjectId(userId);
        
        // Check if current user follows this user
        const isFollowing = user.followers?.some((follower: any) => 
            follower._id?.equals(currentUserObjectId)
        ) ?? false;

        // Check if user follows current user (mutual)
        const currentUser = await User.findById(session?.user?.id);
        const isMutualFollowing = currentUser?.following?.some((followee: any) =>
            followee._id?.equals(userObjectId)
        ) ?? false;

        // If not following and not mutual, show limited profile
        if (!isFollowing && !isMutualFollowing && user.role !== 'admin') {
            return NextResponse.json({
                _id: user._id,
                name: user.name,
                username: user.username,
                image: user.image,
                status: user.status,
                bio: user.bio || null,
                followersCount: user.followers?.length || 0,
                followingCount: user.following?.length || 0,
                isFollowing: false,
                isMutual: false,
                message: "Follow this user to see their full profile"
            }, { status: 200 });
        }

        // Return full profile if following or mutual
        return NextResponse.json({
            ...user.toObject(),
            isFollowing: isFollowing,
            isMutual: isMutualFollowing,
        }, { status: 200 });
    } catch (error) {
        console.error("GET_PROFILE_ERROR", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function PUT(
    req: Request,
    { params }: { params: Promise<{ userId: string }> }
) {
    try {
        const { userId } = await params;
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (session.user.id !== userId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const data = await req.json();
        const allowedFields = ['name', 'username', 'bio', 'image', 'interests', 'courses', 'socialLinks'];
        
        const updateData: any = {};
        allowedFields.forEach(field => {
            if (field in data) {
                updateData[field] = data[field];
            }
        });

        const user = await User.findByIdAndUpdate(session.user.id, updateData, { new: true });

        return NextResponse.json(user, { status: 200 });
    } catch (error) {
        console.error("UPDATE_PROFILE_ERROR", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
