import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import User from "@/models/User";

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ type: string; id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await dbConnect();

        const user = await User.findById(session.user.id);
        if (user.role !== 'superadmin') {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        const { type, id } = await params;

        let Model;
        switch (type) {
            case 'user':
                Model = (await import('@/models/User')).default;
                break;
            case 'server':
                Model = (await import('@/models/Server')).Server;
                break;
            case 'event':
                Model = (await import('@/models/Event')).default;
                break;
            case 'product':
                Model = (await import('@/models/Product')).default;
                break;
            case 'announcement':
                Model = (await import('@/models/Announcement')).Announcement;
                break;
            default:
                return NextResponse.json({ error: "Invalid type" }, { status: 400 });
        }

        await Model.findByIdAndDelete(id);

        return NextResponse.json({ success: true, message: `${type} deleted successfully` });
    } catch (error) {
        console.error("Super admin delete error:", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
