import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import { Invite } from "@/models/Invite";
import { ServerMembers } from "@/models/ServerMembers";
import { v4 as uuidv4 } from "uuid";

export async function GET(req: Request, props: { params: Promise<{ serverId: string }> }) {
    const params = await props.params;
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

        const { serverId } = params;
        await dbConnect();

        // Check permissions (should handle 'Manage Server' permission, but enforcing membership for now)
        const membership = await ServerMembers.findOne({ serverId, userId: session.user.id });
        if (!membership) return NextResponse.json({ message: "Access Denied" }, { status: 403 });

        const invites = await Invite.find({ serverId }).populate("inviterId", "name");
        return NextResponse.json(invites);

    } catch (error) {
        console.error("SERVER_INVITES_GET", error);
        return NextResponse.json({ message: "Internal Error" }, { status: 500 });
    }
}

export async function POST(req: Request, props: { params: Promise<{ serverId: string }> }) {
    const params = await props.params;
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

        const { serverId } = params;
        const body = await req.json();
        const { maxUses, expiresInSeconds } = body;

        await dbConnect();

        // Check permissions
        const membership = await ServerMembers.findOne({ serverId, userId: session.user.id });
        if (!membership) return NextResponse.json({ message: "Access Denied" }, { status: 403 });

        let expiresAt = null;
        if (expiresInSeconds) {
            expiresAt = new Date();
            expiresAt.setSeconds(expiresAt.getSeconds() + expiresInSeconds);
        }

        const invite = await Invite.create({
            code: uuidv4(),
            serverId,
            inviterId: session.user.id,
            maxUses,
            expiresAt
        });

        return NextResponse.json(invite);

    } catch (error) {
        console.error("SERVER_INVITES_POST", error);
        return NextResponse.json({ message: "Internal Error" }, { status: 500 });
    }
}
