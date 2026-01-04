import { NextResponse } from "next/server";
import { uploadImage } from "@/lib/cloudinary";

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;
        const folder = (formData.get("folder") as string) || "uploads";

        if (!file) {
            return NextResponse.json({ message: "No file provided" }, { status: 400 });
        }

        const url = await uploadImage(file, folder);

        return NextResponse.json({ url }, { status: 200 });

    } catch (error) {
        console.error("UPLOAD_ERROR", error);
        return NextResponse.json({ message: "Internal Error" }, { status: 500 });
    }
}
