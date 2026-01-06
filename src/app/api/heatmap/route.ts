import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import UserLocation from '@/models/UserLocation';
import ActiveLocation from '@/models/ActiveLocation';

export async function GET() {
    try {
        await dbConnect();

        // 1. Fetch user locations (posts) from the last 24 hours (expanded window for more activity)
        const postActivityWindow = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const posts = await UserLocation.find(
            { createdAt: { $gte: postActivityWindow } },
            { 'location.coordinates': 1, _id: 0 }
        ).lean();

        // 2. Fetch ACTIVE users (live tracking) - auto-expired by MongoDB TTL
        const activeUsers = await ActiveLocation.find(
            {},
            { 'location.coordinates': 1, _id: 0 }
        ).lean();

        // Combine both sources
        const allPoints = [...posts, ...activeUsers];

        const data = allPoints.map((loc) => ({
            lat: loc.location.coordinates[1],
            lng: loc.location.coordinates[0],
        }));

        return NextResponse.json({
            success: true,
            data,
            meta: {
                activeUsers: activeUsers.length,
                posts: posts.length
            }
        }, { status: 200 });
    } catch (error: any) {
        console.error('Error fetching heatmap data:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
