"use client";

import { useRouter, useParams } from "next/navigation";
import { useEffect } from "react";

export default function DirectMessagePage() {
    const router = useRouter();
    const params = useParams();
    const conversationId = params?.conversationId as string;

    useEffect(() => {
        // Redirect to new messages page
        if (conversationId) {
            router.push(`/messages/${conversationId}`);
        } else {
            router.push(`/messages`);
        }
    }, [conversationId, router]);

    return (
        <div className="flex items-center justify-center h-screen">
            <p className="text-muted-foreground">Redirecting to messages...</p>
        </div>
    );
}
